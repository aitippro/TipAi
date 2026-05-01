pub mod connection;
pub mod migrations;

// Re-export CRUD modules
pub mod users;
pub mod settings;
pub mod prompts;
pub mod templates;
pub mod projects;

pub use connection::Database;
