pub mod connection;
pub mod migrations;

// Re-export CRUD modules
pub mod users;
pub mod settings;
pub mod prompts;
pub mod templates;
pub mod projects;
pub mod conversations;
pub mod summaries;
pub mod evaluations;
pub mod optimizations;

#[allow(unused_imports)]
pub use connection::Database;
