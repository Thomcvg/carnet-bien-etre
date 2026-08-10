package org.carnetbienetre.app

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.Period

/**
 * Lecture des pas depuis Health Connect (E7, § 15.1).
 *
 * **Pourquoi Health Connect et pas Google Fit.** L'interface Fit exige les
 * services Google, que le § 15.2 écarte pour rester éligible à F-Droid. Health
 * Connect est une bibliothèque AndroidX libre ; sur Android 14 et suivants, le
 * service fait partie du système. Sur les versions antérieures il faut
 * l'installer séparément, et l'application le constate au lieu de le supposer.
 *
 * **Ce que ce greffon ne fait pas.** Il ne lit que le nombre de pas, jamais un
 * autre type d'enregistrement, et seulement quand on le lui demande — il n'y a
 * aucune lecture de fond, aucun suivi continu. Rien n'est envoyé nulle part :
 * les pas rejoignent le carnet local comme s'ils avaient été tapés à la main.
 *
 * **Le repli reste la saisie manuelle** : le champ `pas` existe indépendamment,
 * et un appareil sans Health Connect n'affiche simplement pas le bouton.
 */
@CapacitorPlugin(name = "Pas")
class PasPlugin : Plugin() {

    private val permissionLecture = HealthPermission.getReadPermission(StepsRecord::class)

    private fun statutSdk(): Int = HealthConnectClient.getSdkStatus(context)

    private fun clientOuNull(): HealthConnectClient? =
        if (statutSdk() == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }

    /**
     * Trois réponses possibles, et non deux : « indisponible » et « à mettre à
     * jour » appellent des phrases différentes à l'écran.
     */
    @PluginMethod
    fun etat(call: PluginCall) {
        val statut = statutSdk()
        val resultat = JSObject()
        resultat.put(
            "etat",
            when (statut) {
                HealthConnectClient.SDK_AVAILABLE -> "disponible"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "mise-a-jour-requise"
                else -> "indisponible"
            },
        )
        if (statut != HealthConnectClient.SDK_AVAILABLE) {
            resultat.put("autorise", false)
            call.resolve(resultat)
            return
        }
        val client = HealthConnectClient.getOrCreate(context)
        CoroutineScope(Dispatchers.Main).launch {
            val autorise = try {
                client.permissionController.getGrantedPermissions().contains(permissionLecture)
            } catch (e: Exception) {
                false
            }
            resultat.put("autorise", autorise)
            call.resolve(resultat)
        }
    }

    /**
     * Ouvre l'écran d'autorisation de Health Connect. C'est lui qui décide, pas
     * nous : l'application ne peut que demander, et se contenter de la réponse.
     */
    @PluginMethod
    fun demanderAcces(call: PluginCall) {
        if (clientOuNull() == null) {
            call.reject("Health Connect n'est pas disponible sur cet appareil.")
            return
        }
        val contrat = PermissionController.createRequestPermissionResultContract()
        val intention: Intent = contrat.createIntent(context, setOf(permissionLecture))
        startActivityForResult(call, intention, "surReponsePermission")
    }

    @ActivityCallback
    private fun surReponsePermission(call: PluginCall?, resultat: ActivityResult) {
        if (call == null) return
        val client = clientOuNull()
        if (client == null) {
            call.reject("Health Connect n'est pas disponible sur cet appareil.")
            return
        }
        CoroutineScope(Dispatchers.Main).launch {
            val autorise = try {
                client.permissionController.getGrantedPermissions().contains(permissionLecture)
            } catch (e: Exception) {
                false
            }
            call.resolve(JSObject().put("autorise", autorise))
        }
    }

    /**
     * Total de pas par jour civil, entre deux dates incluses.
     *
     * Les journées sans donnée sont **absentes** du résultat, jamais renvoyées à
     * zéro : la règle 5 du carnet vaut aussi pour ce qui vient d'ailleurs — une
     * journée non mesurée n'est pas une journée sans marche.
     */
    @PluginMethod
    fun lire(call: PluginCall) {
        val client = clientOuNull()
        if (client == null) {
            call.reject("Health Connect n'est pas disponible sur cet appareil.")
            return
        }
        val debut = call.getString("debut")
        val fin = call.getString("fin")
        if (debut == null || fin == null) {
            call.reject("Les dates de début et de fin sont nécessaires.")
            return
        }

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val autorise = client.permissionController.getGrantedPermissions()
                    .contains(permissionLecture)
                if (!autorise) {
                    call.reject("L'accès aux pas n'a pas été autorisé.")
                    return@launch
                }

                val reponse = client.aggregateGroupByPeriod(
                    AggregateGroupByPeriodRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(
                            LocalDate.parse(debut).atStartOfDay(),
                            LocalDate.parse(fin).plusDays(1).atStartOfDay(),
                        ),
                        timeRangeSlicer = Period.ofDays(1),
                    ),
                )

                val jours = JSArray()
                for (tranche in reponse) {
                    val total = tranche.result[StepsRecord.COUNT_TOTAL] ?: continue
                    val jour = JSObject()
                    jour.put("date", tranche.startTime.toLocalDate().toString())
                    jour.put("pas", total)
                    jours.put(jour)
                }
                call.resolve(JSObject().put("jours", jours))
            } catch (e: Exception) {
                call.reject(e.message ?: "La lecture des pas a échoué.")
            }
        }
    }
}
