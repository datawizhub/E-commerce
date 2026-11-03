export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      assets: {
        Row: {
          alt_text: string;
          bucket_id: string;
          created_at: string;
          height: number | null;
          id: string;
          mime_type: string;
          processing_state: string;
          storage_path: string;
          updated_at: string;
          version: number;
          width: number | null;
        };
        Insert: {
          alt_text?: string;
          bucket_id?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          mime_type: string;
          processing_state?: string;
          storage_path: string;
          updated_at?: string;
          version?: number;
          width?: number | null;
        };
        Update: {
          alt_text?: string;
          bucket_id?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          mime_type?: string;
          processing_state?: string;
          storage_path?: string;
          updated_at?: string;
          version?: number;
          width?: number | null;
        };
        Relationships: [];
      };
      attribute_categories: {
        Row: {
          category_id: string;
          created_at: string;
          definition_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          definition_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          definition_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attribute_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attribute_categories_definition_id_fkey";
            columns: ["definition_id"];
            isOneToOne: false;
            referencedRelation: "attribute_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      attribute_choices: {
        Row: {
          archived_at: string | null;
          created_at: string;
          definition_id: string;
          field_type: string;
          id: string;
          key: string;
          label: string;
          position: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          definition_id: string;
          field_type: string;
          id?: string;
          key: string;
          label: string;
          position: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          definition_id?: string;
          field_type?: string;
          id?: string;
          key?: string;
          label?: string;
          position?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "attribute_choices_definition_id_field_type_fkey";
            columns: ["definition_id", "field_type"];
            isOneToOne: false;
            referencedRelation: "attribute_definitions";
            referencedColumns: ["id", "field_type"];
          },
        ];
      };
      attribute_definitions: {
        Row: {
          applies_to_all: boolean;
          archived_at: string | null;
          created_at: string;
          field_type: string;
          filterable: boolean;
          id: string;
          key: string;
          label: string;
          unit: string | null;
          updated_at: string;
          version: number;
          visible: boolean;
        };
        Insert: {
          applies_to_all?: boolean;
          archived_at?: string | null;
          created_at?: string;
          field_type: string;
          filterable?: boolean;
          id?: string;
          key: string;
          label: string;
          unit?: string | null;
          updated_at?: string;
          version?: number;
          visible?: boolean;
        };
        Update: {
          applies_to_all?: boolean;
          archived_at?: string | null;
          created_at?: string;
          field_type?: string;
          filterable?: boolean;
          id?: string;
          key?: string;
          label?: string;
          unit?: string | null;
          updated_at?: string;
          version?: number;
          visible?: boolean;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string;
          first_published_at: string | null;
          id: string;
          image_ref: string;
          name: string;
          parent_id: string | null;
          position: number;
          slug: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          first_published_at?: string | null;
          id?: string;
          image_ref?: string;
          name: string;
          parent_id?: string | null;
          position?: number;
          slug: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          first_published_at?: string | null;
          id?: string;
          image_ref?: string;
          name?: string;
          parent_id?: string | null;
          position?: number;
          slug?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_products: {
        Row: {
          collection_id: string;
          created_at: string;
          position: number;
          product_id: string;
        };
        Insert: {
          collection_id: string;
          created_at?: string;
          position: number;
          product_id: string;
        };
        Update: {
          collection_id?: string;
          created_at?: string;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string;
          description: string;
          first_published_at: string | null;
          id: string;
          image_ref: string;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          description?: string;
          first_published_at?: string | null;
          id?: string;
          image_ref?: string;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          first_published_at?: string | null;
          id?: string;
          image_ref?: string;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      option_values: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          key: string;
          label: string;
          option_id: string;
          position: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          key: string;
          label: string;
          option_id: string;
          position: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          key?: string;
          label?: string;
          option_id?: string;
          position?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "option_values_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
        ];
      };
      product_attribute_selections: {
        Row: {
          choice_id: string;
          created_at: string;
          definition_id: string;
          field_type: string;
          value_id: string;
        };
        Insert: {
          choice_id: string;
          created_at?: string;
          definition_id: string;
          field_type: string;
          value_id: string;
        };
        Update: {
          choice_id?: string;
          created_at?: string;
          definition_id?: string;
          field_type?: string;
          value_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_attribute_selections_choice_id_definition_id_fkey";
            columns: ["choice_id", "definition_id"];
            isOneToOne: false;
            referencedRelation: "attribute_choices";
            referencedColumns: ["id", "definition_id"];
          },
          {
            foreignKeyName: "product_attribute_selections_value_id_definition_id_field__fkey";
            columns: ["value_id", "definition_id", "field_type"];
            isOneToOne: false;
            referencedRelation: "product_attribute_values";
            referencedColumns: ["id", "definition_id", "field_type"];
          },
        ];
      };
      product_attribute_values: {
        Row: {
          boolean_value: boolean | null;
          created_at: string;
          definition_id: string;
          field_type: string;
          id: string;
          number_value: number | null;
          product_id: string;
          text_value: string | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          boolean_value?: boolean | null;
          created_at?: string;
          definition_id: string;
          field_type: string;
          id?: string;
          number_value?: number | null;
          product_id: string;
          text_value?: string | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          boolean_value?: boolean | null;
          created_at?: string;
          definition_id?: string;
          field_type?: string;
          id?: string;
          number_value?: number | null;
          product_id?: string;
          text_value?: string | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_definition_id_field_type_fkey";
            columns: ["definition_id", "field_type"];
            isOneToOne: false;
            referencedRelation: "attribute_definitions";
            referencedColumns: ["id", "field_type"];
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          category_id: string;
          created_at: string;
          product_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          product_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_media: {
        Row: {
          alt_override: string | null;
          asset_id: string;
          created_at: string;
          position: number;
          product_id: string;
        };
        Insert: {
          alt_override?: string | null;
          asset_id: string;
          created_at?: string;
          position: number;
          product_id: string;
        };
        Update: {
          alt_override?: string | null;
          asset_id?: string;
          created_at?: string;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_options: {
        Row: {
          created_at: string;
          filter_role: string | null;
          id: string;
          key: string;
          label: string;
          position: number;
          product_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          filter_role?: string | null;
          id?: string;
          key: string;
          label: string;
          position: number;
          product_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          filter_role?: string | null;
          id?: string;
          key?: string;
          label?: string;
          position?: number;
          product_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          created_at: string;
          id: string;
          image_asset_id: string | null;
          option_signature: string;
          position: number;
          product_id: string;
          regular_price_minor: number;
          sku: string;
          status: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_asset_id?: string | null;
          option_signature: string;
          position?: number;
          product_id: string;
          regular_price_minor: number;
          sku: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_asset_id?: string | null;
          option_signature?: string;
          position?: number;
          product_id?: string;
          regular_price_minor?: number;
          sku?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_image_asset_id_fkey";
            columns: ["image_asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          created_at: string;
          description: string;
          first_published_at: string | null;
          id: string;
          image_ref: string;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          description?: string;
          first_published_at?: string | null;
          id?: string;
          image_ref?: string;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          first_published_at?: string | null;
          id?: string;
          image_ref?: string;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      promotion_targets: {
        Row: {
          active_window: unknown;
          created_at: string;
          enabled: boolean;
          product_id: string;
          promotion_id: string;
        };
        Insert: {
          active_window: unknown;
          created_at?: string;
          enabled: boolean;
          product_id: string;
          promotion_id: string;
        };
        Update: {
          active_window?: unknown;
          created_at?: string;
          enabled?: boolean;
          product_id?: string;
          promotion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_target_inherits_schedule";
            columns: ["promotion_id", "active_window", "enabled"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id", "active_window", "enabled"];
          },
          {
            foreignKeyName: "promotion_targets_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      promotions: {
        Row: {
          active_window: unknown;
          amount_minor: number | null;
          created_at: string;
          discount_type: string;
          enabled: boolean;
          ends_at: string | null;
          id: string;
          percent_bps: number | null;
          starts_at: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          active_window?: unknown;
          amount_minor?: number | null;
          created_at?: string;
          discount_type: string;
          enabled?: boolean;
          ends_at?: string | null;
          id?: string;
          percent_bps?: number | null;
          starts_at: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          active_window?: unknown;
          amount_minor?: number | null;
          created_at?: string;
          discount_type?: string;
          enabled?: boolean;
          ends_at?: string | null;
          id?: string;
          percent_bps?: number | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      site_publication: {
        Row: {
          published_at: string;
          revision_id: string;
          revision_state: string;
          singleton: boolean;
          version: number;
        };
        Insert: {
          published_at?: string;
          revision_id: string;
          revision_state?: string;
          singleton?: boolean;
          version?: number;
        };
        Update: {
          published_at?: string;
          revision_id?: string;
          revision_state?: string;
          singleton?: boolean;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "site_publication_revision_id_revision_state_fkey";
            columns: ["revision_id", "revision_state"];
            isOneToOne: false;
            referencedRelation: "site_revisions";
            referencedColumns: ["id", "state"];
          },
        ];
      };
      site_revisions: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          navigation: Json;
          sealed_at: string | null;
          sections: Json;
          settings: Json;
          state: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          navigation?: Json;
          sealed_at?: string | null;
          sections?: Json;
          settings?: Json;
          state?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          navigation?: Json;
          sealed_at?: string | null;
          sections?: Json;
          settings?: Json;
          state?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          created_at: string;
          currency: string;
          display_name: string;
          singleton: boolean;
          timezone: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          display_name: string;
          singleton?: boolean;
          timezone?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          currency?: string;
          display_name?: string;
          singleton?: boolean;
          timezone?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      variant_availability: {
        Row: {
          in_stock: boolean;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          in_stock?: boolean;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          in_stock?: boolean;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_availability_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      variant_option_values: {
        Row: {
          created_at: string;
          option_id: string;
          product_id: string;
          value_id: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          option_id: string;
          product_id: string;
          value_id: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          option_id?: string;
          product_id?: string;
          value_id?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_option_values_option_id_product_id_fkey";
            columns: ["option_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id", "product_id"];
          },
          {
            foreignKeyName: "variant_option_values_value_id_option_id_fkey";
            columns: ["value_id", "option_id"];
            isOneToOne: false;
            referencedRelation: "option_values";
            referencedColumns: ["id", "option_id"];
          },
          {
            foreignKeyName: "variant_option_values_variant_id_product_id_fkey";
            columns: ["variant_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id", "product_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_mutate: {
        Args: {
          expected_version: number;
          kind: string;
          payload: Json;
          request_key: string;
        };
        Returns: Json;
      };
      admin_snapshot: { Args: never; Returns: Json };
      catalog_list: { Args: { query?: Json }; Returns: Json };
      is_store_admin: { Args: never; Returns: boolean };
      media_access: { Args: { asset_id: string }; Returns: Json };
      product_snapshot: { Args: { slug: string }; Returns: Json };
      register_asset: {
        Args: {
          alt_text: string;
          asset_id: string;
          height: number;
          storage_path: string;
          width: number;
        };
        Returns: undefined;
      };
      store_snapshot: { Args: never; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
