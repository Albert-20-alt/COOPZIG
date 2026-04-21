export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      calendrier_production: {
        Row: {
          annee: number | null
          created_at: string
          id: string
          mois: string
          niveau: string
          produit: string
          zone: string | null
        }
        Insert: {
          annee?: number | null
          created_at?: string
          id?: string
          mois: string
          niveau?: string
          produit: string
          zone?: string | null
        }
        Update: {
          annee?: number | null
          created_at?: string
          id?: string
          mois?: string
          niveau?: string
          produit?: string
          zone?: string | null
        }
        Relationships: []
      }
      commandes: {
        Row: {
          acheteur_id: string | null
          client_nom: string | null
          client_telephone: string | null
          created_at: string
          est_precommande: boolean | null
          id: string
          lieu_livraison: string | null
          mode_paiement: string | null
          mois_souhaite: string | null
          montant: number | null
          produit_id: string | null
          produit_nom: string
          quantite: number
          statut: string
          statut_paiement: string | null
          type_lieu: string | null
          unite: string
          updated_at: string
        }
        Insert: {
          acheteur_id?: string | null
          client_nom?: string | null
          client_telephone?: string | null
          created_at?: string
          est_precommande?: boolean | null
          id?: string
          lieu_livraison?: string | null
          mode_paiement?: string | null
          mois_souhaite?: string | null
          montant?: number | null
          produit_id?: string | null
          produit_nom: string
          quantite: number
          statut?: string
          statut_paiement?: string | null
          type_lieu?: string | null
          unite?: string
          updated_at?: string
        }
        Update: {
          acheteur_id?: string | null
          client_nom?: string | null
          client_telephone?: string | null
          created_at?: string
          est_precommande?: boolean | null
          id?: string
          lieu_livraison?: string | null
          mode_paiement?: string | null
          mois_souhaite?: string | null
          montant?: number | null
          produit_id?: string | null
          produit_nom?: string
          quantite?: number
          statut?: string
          statut_paiement?: string | null
          type_lieu?: string | null
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commandes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          metadata: Json | null
          nom_complet: string
          reponse: string | null
          statut: string
          sujet: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          metadata?: Json | null
          nom_complet: string
          reponse?: string | null
          statut?: string
          sujet: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          metadata?: Json | null
          nom_complet?: string
          reponse?: string | null
          statut?: string
          sujet?: string
        }
        Relationships: []
      }
      employes_producteur: {
        Row: {
          id: string
          producteur_id: string
          nom_complet: string
          poste: string
          telephone: string | null
          date_embauche: string | null
          type_contrat: string
          statut_actif: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          producteur_id: string
          nom_complet: string
          poste?: string
          telephone?: string | null
          date_embauche?: string | null
          type_contrat?: string
          statut_actif?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          producteur_id?: string
          nom_complet?: string
          poste?: string
          telephone?: string | null
          date_embauche?: string | null
          type_contrat?: string
          statut_actif?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employes_producteur_producteur_id_fkey"
            columns: ["producteur_id"]
            isOneToOne: false
            referencedRelation: "producteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      cotisations: {
        Row: {
          created_at: string
          date_paiement: string
          id: string
          mode_paiement: string | null
          montant: number
          notes: string | null
          periode: string
          producteur_id: string
          statut: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          id?: string
          mode_paiement?: string | null
          montant: number
          notes?: string | null
          periode: string
          producteur_id: string
          statut?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string
          id?: string
          mode_paiement?: string | null
          montant?: number
          notes?: string | null
          periode?: string
          producteur_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotisations_producteur_id_fkey"
            columns: ["producteur_id"]
            isOneToOne: false
            referencedRelation: "producteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes: {
        Row: {
          created_at: string
          email: string
          entreprise: string | null
          id: string
          localisation: string | null
          message: string | null
          nom_complet: string
          produit: string
          quantite: number
          statut: string
          telephone: string
          unite: string
        }
        Insert: {
          created_at?: string
          email: string
          entreprise?: string | null
          id?: string
          localisation?: string | null
          message?: string | null
          nom_complet: string
          produit: string
          quantite: number
          statut?: string
          telephone: string
          unite?: string
        }
        Update: {
          created_at?: string
          email?: string
          entreprise?: string | null
          id?: string
          localisation?: string | null
          message?: string | null
          nom_complet?: string
          produit?: string
          quantite?: number
          statut?: string
          telephone?: string
          unite?: string
        }
        Relationships: []
      }
      ecritures_comptables: {
        Row: {
          categorie: string | null
          compte_credit_id: string | null
          compte_debit_id: string | null
          created_at: string
          created_by: string | null
          date_ecriture: string
          id: string
          libelle: string
          montant: number
          notes: string | null
          numero_piece: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          categorie?: string | null
          compte_credit_id?: string | null
          compte_debit_id?: string | null
          created_at?: string
          created_by?: string | null
          date_ecriture?: string
          id?: string
          libelle: string
          montant?: number
          notes?: string | null
          numero_piece?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          categorie?: string | null
          compte_credit_id?: string | null
          compte_debit_id?: string | null
          created_at?: string
          created_by?: string | null
          date_ecriture?: string
          id?: string
          libelle?: string
          montant?: number
          notes?: string | null
          numero_piece?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecritures_comptables_compte_credit_id_fkey"
            columns: ["compte_credit_id"]
            isOneToOne: false
            referencedRelation: "plan_comptable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecritures_comptables_compte_debit_id_fkey"
            columns: ["compte_debit_id"]
            isOneToOne: false
            referencedRelation: "plan_comptable"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client_contact: string | null
          client_nom: string
          commande_id: string | null
          created_at: string
          created_by: string | null
          date_echeance: string | null
          date_facture: string
          id: string
          lignes: Json
          montant_ht: number
          montant_ttc: number
          notes: string | null
          numero_facture: string
          statut: string
          tva: number
          type: string
          updated_at: string
        }
        Insert: {
          client_contact?: string | null
          client_nom: string
          commande_id?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_facture?: string
          id?: string
          lignes?: Json
          montant_ht?: number
          montant_ttc?: number
          notes?: string | null
          numero_facture: string
          statut?: string
          tva?: number
          type?: string
          updated_at?: string
        }
        Update: {
          client_contact?: string | null
          client_nom?: string
          commande_id?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_facture?: string
          id?: string
          lignes?: Json
          montant_ht?: number
          montant_ttc?: number
          notes?: string | null
          numero_facture?: string
          statut?: string
          tva?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
        ]
      }
      livraisons: {
        Row: {
          chauffeur_nom: string | null
          commande_id: string
          created_at: string
          date_livraison: string | null
          date_prevue: string | null
          destination: string
          id: string
          statut: string
          type_destination: string | null
          vehicule_info: string | null
        }
        Insert: {
          chauffeur_nom?: string | null
          commande_id: string
          created_at?: string
          date_livraison?: string | null
          date_prevue?: string | null
          destination: string
          id?: string
          statut?: string
          type_destination?: string | null
          vehicule_info?: string | null
        }
        Update: {
          chauffeur_nom?: string | null
          commande_id?: string
          created_at?: string
          date_livraison?: string | null
          date_prevue?: string | null
          destination?: string
          id?: string
          statut?: string
          type_destination?: string | null
          vehicule_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livraisons_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lu: boolean | null
          message: string
          titre: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lu?: boolean | null
          message: string
          titre: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lu?: boolean | null
          message?: string
          titre?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pertes_postrecolte: {
        Row: {
          cause: string
          created_at: string
          date_constat: string
          id: string
          notes: string | null
          producteur_id: string
          produit: string
          quantite_initiale: number
          quantite_perdue: number
          unite: string
          zone: string | null
        }
        Insert: {
          cause?: string
          created_at?: string
          date_constat?: string
          id?: string
          notes?: string | null
          producteur_id: string
          produit: string
          quantite_initiale?: number
          quantite_perdue?: number
          unite?: string
          zone?: string | null
        }
        Update: {
          cause?: string
          created_at?: string
          date_constat?: string
          id?: string
          notes?: string | null
          producteur_id?: string
          produit?: string
          quantite_initiale?: number
          quantite_perdue?: number
          unite?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pertes_postrecolte_producteur_id_fkey"
            columns: ["producteur_id"]
            isOneToOne: false
            referencedRelation: "producteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_comptable: {
        Row: {
          classe: string
          created_at: string
          id: string
          libelle: string
          numero: string
          solde_initial: number
          type: string
        }
        Insert: {
          classe: string
          created_at?: string
          id?: string
          libelle: string
          numero: string
          solde_initial?: number
          type?: string
        }
        Update: {
          classe?: string
          created_at?: string
          id?: string
          libelle?: string
          numero?: string
          solde_initial?: number
          type?: string
        }
        Relationships: []
      }
      prix_marche: {
        Row: {
          created_at: string
          date_releve: string
          id: string
          marche: string
          prix: number
          produit: string
          source: string | null
          tendance: string | null
          unite_prix: string
        }
        Insert: {
          created_at?: string
          date_releve?: string
          id?: string
          marche: string
          prix: number
          produit: string
          source?: string | null
          tendance?: string | null
          unite_prix?: string
        }
        Update: {
          created_at?: string
          date_releve?: string
          id?: string
          marche?: string
          prix?: number
          produit?: string
          source?: string | null
          tendance?: string | null
          unite_prix?: string
        }
        Relationships: []
      }
      producteurs: {
        Row: {
          certification: string | null
          created_at: string
          cultures: string[] | null
          date_adhesion: string | null
          email: string | null
          id: string
          localisation: string
          nom: string
          photo_url: string | null
          statut_actif: boolean | null
          superficie: number | null
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certification?: string | null
          created_at?: string
          cultures?: string[] | null
          date_adhesion?: string | null
          email?: string | null
          id?: string
          localisation?: string
          nom: string
          photo_url?: string | null
          statut_actif?: boolean | null
          superficie?: number | null
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certification?: string | null
          created_at?: string
          cultures?: string[] | null
          date_adhesion?: string | null
          email?: string | null
          id?: string
          localisation?: string
          nom?: string
          photo_url?: string | null
          statut_actif?: boolean | null
          superficie?: number | null
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      produits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          nom: string
          norme_qualite: string | null
          quantite_estimee: number | null
          saison: string | null
          updated_at: string
          usage_type: string | null
          variete: string | null
          zone_production: string | null
          prix_coop: number | null
          prix_marche: number | null
          categorie: string | null
          in_ecommerce: boolean | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          norme_qualite?: string | null
          quantite_estimee?: number | null
          saison?: string | null
          updated_at?: string
          usage_type?: string | null
          variete?: string | null
          zone_production?: string | null
          prix_coop?: number | null
          prix_marche?: number | null
          categorie?: string | null
          in_ecommerce?: boolean | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          norme_qualite?: string | null
          quantite_estimee?: number | null
          saison?: string | null
          updated_at?: string
          usage_type?: string | null
          variete?: string | null
          zone_production?: string | null
          prix_coop?: number | null
          prix_marche?: number | null
          categorie?: string | null
          in_ecommerce?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          entreprise: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          entreprise?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          entreprise?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recoltes: {
        Row: {
          created_at: string
          date_disponibilite: string
          id: string
          producteur_id: string
          produit: string
          qualite: string
          quantite: number
          unite: string
          verger_id: string
        }
        Insert: {
          created_at?: string
          date_disponibilite?: string
          id?: string
          producteur_id: string
          produit: string
          qualite?: string
          quantite?: number
          unite?: string
          verger_id: string
        }
        Update: {
          created_at?: string
          date_disponibilite?: string
          id?: string
          producteur_id?: string
          produit?: string
          qualite?: string
          quantite?: number
          unite?: string
          verger_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recoltes_producteur_id_fkey"
            columns: ["producteur_id"]
            isOneToOne: false
            referencedRelation: "producteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recoltes_verger_id_fkey"
            columns: ["verger_id"]
            isOneToOne: false
            referencedRelation: "vergers"
            referencedColumns: ["id"]
          },
        ]
      }
      site_config: {
        Row: {
          categorie: string | null
          cle: string
          id: string
          type: string | null
          updated_at: string
          valeur: string | null
        }
        Insert: {
          categorie?: string | null
          cle: string
          id?: string
          type?: string | null
          updated_at?: string
          valeur?: string | null
        }
        Update: {
          categorie?: string | null
          cle?: string
          id?: string
          type?: string | null
          updated_at?: string
          valeur?: string | null
        }
        Relationships: []
      }
      stats_publiques: {
        Row: {
          cle: string
          description: string | null
          id: string
          ordre: number | null
          updated_at: string
          valeur: string
        }
        Insert: {
          cle: string
          description?: string | null
          id?: string
          ordre?: number | null
          updated_at?: string
          valeur: string
        }
        Update: {
          cle?: string
          description?: string | null
          id?: string
          ordre?: number | null
          updated_at?: string
          valeur?: string
        }
        Relationships: []
      }
      stocks: {
        Row: {
          id: string
          producteur_id: string | null
          produit_id: string | null
          produit_nom: string
          quantite_disponible: number
          quantite_reservee: number
          quantite_vendue: number
          unite: string
          updated_at: string
        }
        Insert: {
          id?: string
          producteur_id?: string | null
          produit_id?: string | null
          produit_nom: string
          quantite_disponible?: number
          quantite_reservee?: number
          quantite_vendue?: number
          unite?: string
          updated_at?: string
        }
        Update: {
          id?: string
          producteur_id?: string | null
          produit_id?: string | null
          produit_nom?: string
          quantite_disponible?: number
          quantite_reservee?: number
          quantite_vendue?: number
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_producteur_id_fkey"
            columns: ["producteur_id"]
            isOneToOne: false
            referencedRelation: "producteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocks_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      tresorerie: {
        Row: {
          categorie: string
          created_at: string
          created_by: string | null
          date_mouvement: string
          id: string
          libelle: string
          mode_paiement: string | null
          montant: number
          notes: string | null
          reference: string | null
          solde_apres: number | null
          type: string
        }
        Insert: {
          categorie?: string
          created_at?: string
          created_by?: string | null
          date_mouvement?: string
          id?: string
          libelle: string
          mode_paiement?: string | null
          montant?: number
          notes?: string | null
          reference?: string | null
          solde_apres?: number | null
          type?: string
        }
        Update: {
          categorie?: string
          created_at?: string
          created_by?: string | null
          date_mouvement?: string
          id?: string
          libelle?: string
          mode_paiement?: string | null
          montant?: number
          notes?: string | null
          reference?: string | null
          solde_apres?: number | null
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vergers: {
        Row: {
          created_at: string
          culture: string
          estimation_rendement: number | null
          etat: string
          id: string
          localisation: string | null
          nom: string
          producteur_id: string
          superficie: number | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          culture: string
          estimation_rendement?: number | null
          etat?: string
          id?: string
          localisation?: string | null
          nom: string
          producteur_id: string
          superficie?: number | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          culture?: string
          estimation_rendement?: number | null
          etat?: string
          id?: string
          localisation?: string | null
          nom?: string
          producteur_id?: string
          superficie?: number | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vergers_producteur_id_fkey"
            columns: ["producteur_id"]
            isOneToOne: false
            referencedRelation: "producteurs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "producteur" | "acheteur" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "producteur", "acheteur", "superadmin"],
    },
  },
} as const
