export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shows: {
        Row: {
          id: string;
          name: string;
          slug: string;
          avatar_url: string | null;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          avatar_url?: string | null;
          status?: "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          avatar_url?: string | null;
          status?: "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      show_setting_definitions: {
        Row: {
          id: string;
          label: string;
          field_type: "yes_no" | "text" | "textarea" | "checklist";
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          field_type: "yes_no" | "text" | "textarea" | "checklist";
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          field_type?: "yes_no" | "text" | "textarea" | "checklist";
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      show_setting_values: {
        Row: {
          id: string;
          show_id: string;
          setting_definition_id: string;
          value_json: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          show_id: string;
          setting_definition_id: string;
          value_json?: Json | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          show_id?: string;
          setting_definition_id?: string;
          value_json?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      processes: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflows: {
        Row: {
          id: string;
          name: string;
          item_label: string;
          process_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          item_label?: string;
          process_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          item_label?: string;
          process_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      role_members: {
        Row: {
          id: string;
          role_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      show_role_assignments: {
        Row: {
          id: string;
          show_id: string;
          role_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          show_id: string;
          role_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          show_id?: string;
          role_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      task_templates: {
        Row: {
          id: string;
          process_id: string;
          title: string;
          description: string | null;
          position: number;
          assignment_mode: "role" | "user" | "none";
          assigned_role_id: string | null;
          assigned_user_id: string | null;
          visibility_logic: "and" | "or";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          process_id: string;
          title: string;
          description?: string | null;
          position?: number;
          assignment_mode?: "role" | "user" | "none";
          assigned_role_id?: string | null;
          assigned_user_id?: string | null;
          visibility_logic?: "and" | "or";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          process_id?: string;
          title?: string;
          description?: string | null;
          position?: number;
          assignment_mode?: "role" | "user" | "none";
          assigned_role_id?: string | null;
          assigned_user_id?: string | null;
          visibility_logic?: "and" | "or";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_template_blocks: {
        Row: {
          id: string;
          task_template_id: string;
          block_type:
            | "description"
            | "text_input"
            | "rich_text"
            | "dropdown"
            | "radio"
            | "checkbox"
            | "file_attachment"
            | "date_time"
            | "heading"
            | "comments";
          label: string;
          required: boolean;
          options_json: Json | null;
          display_order: number;
          token_name: string | null;
        };
        Insert: {
          id?: string;
          task_template_id: string;
          block_type:
            | "description"
            | "text_input"
            | "rich_text"
            | "dropdown"
            | "radio"
            | "checkbox"
            | "file_attachment"
            | "date_time"
            | "heading"
            | "comments";
          label: string;
          required?: boolean;
          options_json?: Json | null;
          display_order?: number;
          token_name?: string | null;
        };
        Update: {
          id?: string;
          task_template_id?: string;
          block_type?:
            | "description"
            | "text_input"
            | "rich_text"
            | "dropdown"
            | "radio"
            | "checkbox"
            | "file_attachment"
            | "date_time"
            | "heading"
            | "comments";
          label?: string;
          required?: boolean;
          options_json?: Json | null;
          display_order?: number;
          token_name?: string | null;
        };
        Relationships: [];
      };
      task_template_visibility_rules: {
        Row: {
          id: string;
          task_template_id: string;
          name: string;
          setting_definition_id: string;
          operator:
            | "must_contain"
            | "must_not_contain"
            | "must_not_be_empty"
            | "must_be_empty";
          target_value: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_template_id: string;
          name: string;
          setting_definition_id: string;
          operator:
            | "must_contain"
            | "must_not_contain"
            | "must_not_be_empty"
            | "must_be_empty";
          target_value?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_template_id?: string;
          name?: string;
          setting_definition_id?: string;
          operator?:
            | "must_contain"
            | "must_not_contain"
            | "must_not_be_empty"
            | "must_be_empty";
          target_value?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      task_template_dependencies: {
        Row: {
          id: string;
          task_template_id: string;
          depends_on_task_template_id: string;
          condition_type: "completed";
        };
        Insert: {
          id?: string;
          task_template_id: string;
          depends_on_task_template_id: string;
          condition_type?: "completed";
        };
        Update: {
          id?: string;
          task_template_id?: string;
          depends_on_task_template_id?: string;
          condition_type?: "completed";
        };
        Relationships: [];
      };
      task_template_date_rules: {
        Row: {
          id: string;
          task_template_id: string;
          date_field: "start_date" | "due_date";
          relative_to: "task_start" | "task_due" | "episode_start";
          relative_task_template_id: string | null;
          offset_days: number;
          offset_hours: number;
        };
        Insert: {
          id?: string;
          task_template_id: string;
          date_field: "start_date" | "due_date";
          relative_to: "task_start" | "task_due" | "episode_start";
          relative_task_template_id?: string | null;
          offset_days?: number;
          offset_hours?: number;
        };
        Update: {
          id?: string;
          task_template_id?: string;
          date_field?: "start_date" | "due_date";
          relative_to?: "task_start" | "task_due" | "episode_start";
          relative_task_template_id?: string | null;
          offset_days?: number;
          offset_hours?: number;
        };
        Relationships: [];
      };
      task_template_email_templates: {
        Row: {
          id: string;
          task_template_id: string;
          from_name: string;
          subject_template: string;
          body_template: string;
          auto_send_on_complete: boolean;
        };
        Insert: {
          id?: string;
          task_template_id: string;
          from_name: string;
          subject_template: string;
          body_template: string;
          auto_send_on_complete?: boolean;
        };
        Update: {
          id?: string;
          task_template_id?: string;
          from_name?: string;
          subject_template?: string;
          body_template?: string;
          auto_send_on_complete?: boolean;
        };
        Relationships: [];
      };
      task_template_completion_actions: {
        Row: {
          id: string;
          task_template_id: string;
          action_type:
            | "send_notification"
            | "send_email"
            | "add_tag"
            | "remove_tag"
            | "send_webhook";
          config_json: Json | null;
        };
        Insert: {
          id?: string;
          task_template_id: string;
          action_type:
            | "send_notification"
            | "send_email"
            | "add_tag"
            | "remove_tag"
            | "send_webhook";
          config_json?: Json | null;
        };
        Update: {
          id?: string;
          task_template_id?: string;
          action_type?:
            | "send_notification"
            | "send_email"
            | "add_tag"
            | "remove_tag"
            | "send_webhook";
          config_json?: Json | null;
        };
        Relationships: [];
      };
      episodes: {
        Row: {
          id: string;
          workflow_id: string;
          process_id: string;
          show_id: string;
          title: string;
          status: "active" | "completed" | "archived";
          progress_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          process_id: string;
          show_id: string;
          title: string;
          status?: "active" | "completed" | "archived";
          progress_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          process_id?: string;
          show_id?: string;
          title?: string;
          status?: "active" | "completed" | "archived";
          progress_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          episode_id: string;
          task_template_id: string;
          title: string;
          position: number;
          status: "open" | "completed" | "blocked";
          is_visible: boolean;
          assigned_user_id: string | null;
          start_date: string | null;
          due_date: string | null;
          completed_at: string | null;
          completed_by: string | null;
          email_body_override: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          episode_id: string;
          task_template_id: string;
          title: string;
          position?: number;
          status?: "open" | "completed" | "blocked";
          is_visible?: boolean;
          assigned_user_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          email_body_override?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string;
          task_template_id?: string;
          title?: string;
          position?: number;
          status?: "open" | "completed" | "blocked";
          is_visible?: boolean;
          assigned_user_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          email_body_override?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_block_responses: {
        Row: {
          id: string;
          task_id: string;
          task_template_block_id: string;
          value_json: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          task_template_block_id: string;
          value_json?: Json | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          task_template_block_id?: string;
          value_json?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
