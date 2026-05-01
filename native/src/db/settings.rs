use rusqlite::params;

use crate::{UpdateSettings, UserSettings};
use crate::crypto;

use super::connection::{Database, DbResult};

impl Database {
    pub fn settings_get(&self, user_id: i64) -> DbResult<UserSettings> {
        let mut stmt = self.conn.prepare(
            "SELECT userId, defaultModel, defaultFramework, defaultLanguage,
                    kimiApiKey, openaiApiKey, claudeApiKey, deepseekApiKey
             FROM user_settings WHERE userId = ?1",
        )?;

        let row = stmt.query_row(params![user_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
            ))
        }).optional()?;

        if let Some((uid, dm, df, dl, kk, ok, ck, dk)) = row {
            let sk = self.secret_key();
            let has_kimi = kk.as_ref().map_or(false, |v| !v.is_empty());
            let has_openai = ok.as_ref().map_or(false, |v| !v.is_empty());
            let has_claude = ck.as_ref().map_or(false, |v| !v.is_empty());
            let has_deepseek = dk.as_ref().map_or(false, |v| !v.is_empty());

            return Ok(UserSettings {
                user_id: uid,
                default_model: dm,
                default_framework: df,
                default_language: dl,
                has_kimi_key: has_kimi,
                has_openai_key: has_openai,
                has_claude_key: has_claude,
                has_deepseek_key: has_deepseek,
            });
        }

        // No settings found — create defaults
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO user_settings (userId, defaultModel, defaultFramework, defaultLanguage, createdAt, updatedAt)
             VALUES (?1, 'kimi', 'auto', 'zh', ?2, ?2)
             ON CONFLICT(userId) DO NOTHING",
            params![user_id, now],
        )?;

        Ok(UserSettings {
            user_id,
            default_model: "kimi".to_string(),
            default_framework: "auto".to_string(),
            default_language: "zh".to_string(),
            has_kimi_key: false,
            has_openai_key: false,
            has_claude_key: false,
            has_deepseek_key: false,
        })
    }

    pub fn settings_update(&self, user_id: i64, data: UpdateSettings) -> DbResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let mut fields: Vec<String> = vec!["updatedAt = ?1".to_string()];
        let mut values: Vec<rusqlite::types::Value> = vec![now.into()];

        if let Some(v) = data.default_model {
            fields.push(format!("defaultModel = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.default_framework {
            fields.push(format!("defaultFramework = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.default_language {
            fields.push(format!("defaultLanguage = ?{}", values.len() + 1));
            values.push(v.into());
        }

        let sk = self.secret_key();

        if let Some(v) = data.kimi_api_key {
            if !v.is_empty() && v != "***" {
                let encrypted = sk.map(|k| crypto::encrypt(&v, k))
                    .unwrap_or_else(|| Ok(v.clone()))?;
                fields.push(format!("kimiApiKey = ?{}", values.len() + 1));
                values.push(encrypted.into());
            }
        }
        if let Some(v) = data.openai_api_key {
            if !v.is_empty() && v != "***" {
                let encrypted = sk.map(|k| crypto::encrypt(&v, k))
                    .unwrap_or_else(|| Ok(v.clone()))?;
                fields.push(format!("openaiApiKey = ?{}", values.len() + 1));
                values.push(encrypted.into());
            }
        }
        if let Some(v) = data.claude_api_key {
            if !v.is_empty() && v != "***" {
                let encrypted = sk.map(|k| crypto::encrypt(&v, k))
                    .unwrap_or_else(|| Ok(v.clone()))?;
                fields.push(format!("claudeApiKey = ?{}", values.len() + 1));
                values.push(encrypted.into());
            }
        }
        if let Some(v) = data.deepseek_api_key {
            if !v.is_empty() && v != "***" {
                let encrypted = sk.map(|k| crypto::encrypt(&v, k))
                    .unwrap_or_else(|| Ok(v.clone()))?;
                fields.push(format!("deepseekApiKey = ?{}", values.len() + 1));
                values.push(encrypted.into());
            }
        }

        if fields.len() == 1 {
            // Only updatedAt, nothing to do
            return Ok(());
        }

        // Add userId as final param
        let sql = format!(
            "INSERT INTO user_settings (userId, defaultModel, defaultFramework, defaultLanguage, createdAt, updatedAt)
             VALUES (?{}, 'kimi', 'auto', 'zh', ?, ?)
             ON CONFLICT(userId) DO UPDATE SET {}",
            values.len() + 2,
            fields.join(", "),
        );

        values.push(user_id.into());
        values.push(now.into());
        values.push(now.into());

        self.conn.execute(&sql, rusqlite::params_from_iter(values.iter()))?;
        Ok(())
    }

    pub fn settings_get_api_key(&self, user_id: i64, provider: &str) -> DbResult<Option<String>> {
        let col = match provider {
            "kimi" => "kimiApiKey",
            "openai" => "openaiApiKey",
            "claude" => "claudeApiKey",
            "deepseek" => "deepseekApiKey",
            _ => return Ok(None),
        };

        let sql = format!("SELECT {} FROM user_settings WHERE userId = ?1", col);
        let encrypted: Option<String> = self.conn
            .query_row(&sql, params![user_id], |row| row.get(0))
            .optional()?;

        match encrypted {
            Some(v) if !v.is_empty() => {
                let sk = self.secret_key();
                let decrypted = sk.map(|k| crypto::decrypt(&v, k))
                    .unwrap_or_else(|| Ok(v))?;
                Ok(Some(decrypted))
            }
            _ => Ok(None),
        }
    }
}
