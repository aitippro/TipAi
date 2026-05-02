use napi::bindgen_prelude::*;
use napi_derive::napi;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// AI Provider configuration
#[derive(Clone, Debug)]
struct ProviderConfig {
    base_url: String,
    model_id: String,
    auth_header: String,
    auth_prefix: String,
    is_claude: bool,
}

fn get_provider_config(provider: &str, model_id: Option<&str>, base_url: Option<&str>) -> Option<ProviderConfig> {
    match provider {
        "deepseek" => Some(ProviderConfig {
            base_url: base_url.map(|s| s.to_string()).unwrap_or_else(|| "https://api.deepseek.com/v1/chat/completions".to_string()),
            model_id: model_id.map(|s| s.to_string()).unwrap_or_else(|| "deepseek-chat".to_string()),
            auth_header: "Authorization".to_string(),
            auth_prefix: "Bearer ".to_string(),
            is_claude: false,
        }),
        "kimi" => Some(ProviderConfig {
            base_url: base_url.map(|s| s.to_string()).unwrap_or_else(|| "https://api.moonshot.cn/v1/chat/completions".to_string()),
            model_id: model_id.map(|s| s.to_string()).unwrap_or_else(|| "moonshot-v1-8k".to_string()),
            auth_header: "Authorization".to_string(),
            auth_prefix: "Bearer ".to_string(),
            is_claude: false,
        }),
        "openai" => Some(ProviderConfig {
            base_url: base_url.map(|s| s.to_string()).unwrap_or_else(|| "https://api.openai.com/v1/chat/completions".to_string()),
            model_id: model_id.map(|s| s.to_string()).unwrap_or_else(|| "gpt-4o-mini".to_string()),
            auth_header: "Authorization".to_string(),
            auth_prefix: "Bearer ".to_string(),
            is_claude: false,
        }),
        "claude" => Some(ProviderConfig {
            base_url: base_url.map(|s| s.to_string()).unwrap_or_else(|| "https://api.anthropic.com/v1/messages".to_string()),
            model_id: model_id.map(|s| s.to_string()).unwrap_or_else(|| "claude-3-sonnet-20240229".to_string()),
            auth_header: "x-api-key".to_string(),
            auth_prefix: "".to_string(),
            is_claude: true,
        }),
        _ => base_url.map(|url| ProviderConfig {
            base_url: url.to_string(),
            model_id: model_id.map(|s| s.to_string()).unwrap_or_default(),
            auth_header: "Authorization".to_string(),
            auth_prefix: "Bearer ".to_string(),
            is_claude: false,
        }),
    }
}

// ── Request/Response types ──────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct AiCallRequest {
    pub provider: String,
    pub api_key: String,
    pub model_id: Option<String>,
    pub base_url: Option<String>,
    pub system_prompt: String,
    pub user_message: String,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i64>,
    pub timeout_ms: Option<i64>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct AiCallResponse {
    pub content: String,
    pub error: Option<String>,
}

#[derive(Serialize)]
struct OpenAiMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OpenAiRequest {
    model: String,
    messages: Vec<OpenAiMessage>,
    temperature: f64,
    max_tokens: i32,
}

#[derive(Deserialize, Debug)]
struct OpenAiChoice {
    message: OpenAiMessageResponse,
}

#[derive(Deserialize, Debug)]
struct OpenAiMessageResponse {
    content: String,
}

#[derive(Deserialize, Debug)]
struct OpenAiResponse {
    choices: Vec<OpenAiChoice>,
}

// Claude-specific types
#[derive(Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: i32,
    system: String,
    messages: Vec<ClaudeMessage>,
    temperature: f64,
}

#[derive(Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Deserialize, Debug)]
struct ClaudeContent {
    #[serde(rename = "type")]
    _type: String,
    text: String,
}

#[derive(Deserialize, Debug)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
}

// ── Core async functions ────────────────────────────────────

async fn call_ai_single(req: &AiCallRequest) -> std::result::Result<AiCallResponse, String> {
    if req.api_key.is_empty() {
        return Ok(AiCallResponse {
            content: String::new(),
            error: Some(format!("No API key for {}", req.provider)),
        });
    }

    let config = match get_provider_config(&req.provider, req.model_id.as_deref(), req.base_url.as_deref()) {
        Some(c) => c,
        None => return Ok(AiCallResponse {
            content: String::new(),
            error: Some(format!("Unknown provider: {}", req.provider)),
        }),
    };

    let temp = req.temperature.unwrap_or(0.5).clamp(0.0, 2.0);
    let max_tokens = req.max_tokens.unwrap_or(4000) as i32;
    let timeout = Duration::from_millis(req.timeout_ms.unwrap_or(30000) as u64);

    let client = Client::builder()
        .timeout(timeout)
        .build()
        .map_err(|e| e.to_string())?;

    let result = if config.is_claude {
        call_claude(&client, &config, &req.api_key, &req.system_prompt, &req.user_message, temp, max_tokens).await
    } else {
        call_openai_compatible(&client, &config, &req.api_key, &req.system_prompt, &req.user_message, temp, max_tokens).await
    };

    match result {
        Ok(content) => Ok(AiCallResponse { content, error: None }),
        Err(e) => Ok(AiCallResponse { content: String::new(), error: Some(e) }),
    }
}

async fn call_openai_compatible(
    client: &Client,
    config: &ProviderConfig,
    api_key: &str,
    system_prompt: &str,
    user_message: &str,
    temperature: f64,
    max_tokens: i32,
) -> std::result::Result<String, String> {
    let body = OpenAiRequest {
        model: config.model_id.clone(),
        messages: vec![
            OpenAiMessage { role: "system".to_string(), content: system_prompt.to_string() },
            OpenAiMessage { role: "user".to_string(), content: user_message.to_string() },
        ],
        temperature,
        max_tokens,
    };

    let response = client
        .post(&config.base_url)
        .header(&config.auth_header, format!("{}{}", config.auth_prefix, api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }

    let data: OpenAiResponse = response.json().await.map_err(|e| format!("JSON parse error: {}", e))?;
    
    data.choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "Empty response".to_string())
}

async fn call_claude(
    client: &Client,
    config: &ProviderConfig,
    api_key: &str,
    system_prompt: &str,
    user_message: &str,
    temperature: f64,
    max_tokens: i32,
) -> std::result::Result<String, String> {
    let body = ClaudeRequest {
        model: config.model_id.clone(),
        max_tokens,
        system: system_prompt.to_string(),
        messages: vec![
            ClaudeMessage { role: "user".to_string(), content: user_message.to_string() },
        ],
        temperature,
    };

    let response = client
        .post(&config.base_url)
        .header(&config.auth_header, api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Claude API error {}: {}", status, text));
    }

    let data: ClaudeResponse = response.json().await.map_err(|e| format!("JSON parse error: {}", e))?;
    
    data.content
        .into_iter()
        .next()
        .map(|c| c.text)
        .ok_or_else(|| "Empty response".to_string())
}

// ── NAPI exported functions ─────────────────────────────────

#[napi]
pub async fn ai_call(req: AiCallRequest) -> Result<AiCallResponse> {
    call_ai_single(&req).await.map_err(|e| Error::from_reason(e))
}

#[napi]
pub async fn ai_call_self_consistency(req: AiCallRequest, sample_count: Option<i64>) -> Result<AiCallResponse> {
    let count = sample_count.unwrap_or(5).clamp(3, 10) as usize;
    let temp = req.temperature.unwrap_or(0.7);

    let mut tasks = Vec::with_capacity(count);
    for _ in 0..count {
        let mut r = req.clone();
        r.temperature = Some(temp);
        tasks.push(tokio::spawn(async move {
            call_ai_single(&r).await
        }));
    }

    let mut results = Vec::with_capacity(count);
    for task in tasks {
        match task.await {
            Ok(Ok(resp)) if resp.error.is_none() && !resp.content.is_empty() => {
                results.push(resp.content);
            }
            _ => {}
        }
    }

    if results.is_empty() {
        return Ok(AiCallResponse {
            content: String::new(),
            error: Some("All self-consistency paths failed".to_string()),
        });
    }

    // Vote by normalized text
    let mut votes: std::collections::HashMap<String, (String, usize)> = std::collections::HashMap::new();
    for text in &results {
        let key = text.to_lowercase().replace(|c: char| c.is_whitespace(), " ").trim().to_string();
        votes.entry(key)
            .and_modify(|(_, count)| *count += 1)
            .or_insert_with(|| (text.clone(), 1));
    }

    let winner = votes.into_iter()
        .max_by_key(|(_, (_, count))| *count)
        .map(|(_, (text, count))| {
            println!("[Rust SC] Winner: {}/{} votes", count, results.len());
            text
        })
        .unwrap_or_default();

    Ok(AiCallResponse {
        content: winner,
        error: None,
    })
}
