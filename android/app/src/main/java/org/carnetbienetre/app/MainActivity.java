package org.carnetbienetre.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // E7 : le seul greffon natif du projet. Enregistré explicitement plutôt
        // que découvert automatiquement, pour que la liste de ce qui touche au
        // système tienne dans une ligne visible.
        registerPlugin(PasPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
