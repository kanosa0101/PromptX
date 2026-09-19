//! 变量解析与替换工具

use crate::models::{Variable, VarType};
use chrono::Local;
use regex::Regex;
use std::collections::HashMap;
use std::sync::LazyLock;

/// 系统变量列表
const SYSTEM_VARIABLES: [&str; 4] = ["clipboard", "date", "time", "timestamp"];

/// 预编译变量匹配正则（支持中文等 Unicode 变量名）
static VARIABLE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\{\{([^{}]+)\}\}").unwrap()
});

/// 解析提示词中的变量
pub fn parse_variables(content: &str) -> Vec<Variable> {
    let mut variables: Vec<Variable> = Vec::new();
    let mut seen: HashMap<String, bool> = HashMap::new();

    for cap in VARIABLE_REGEX.captures_iter(content) {
        let name = cap[1].trim().to_string();
        if name.is_empty() || seen.contains_key(&name) {
            continue;
        }
        seen.insert(name.clone(), true);
        let var_type = if SYSTEM_VARIABLES.contains(&name.as_str()) {
            VarType::System
        } else {
            VarType::Custom
        };
        variables.push(Variable {
            name,
            var_type,
            default_value: None,
        });
    }

    variables
}

/// 替换变量为实际值
#[allow(dead_code)]
pub fn replace_variables(content: &str, values: HashMap<String, String>) -> String {
    let mut result = content.to_string();

    for (name, value) in values {
        result = result.replace(&format!("{{{{{}}}}}", name), &value);
    }

    result
}

/// 获取系统变量的值
#[allow(dead_code)]
pub fn get_system_variable_value(name: &str, clipboard: Option<&str>) -> String {
    match name {
        "clipboard" => clipboard.unwrap_or("").to_string(),
        "date" => Local::now().format("%Y-%m-%d").to_string(),
        "time" => Local::now().format("%H:%M:%S").to_string(),
        "timestamp" => Local::now().timestamp().to_string(),
        _ => String::new(),
    }
}

/// 获取所有系统变量的值
#[allow(dead_code)]
pub fn get_all_system_variables(clipboard: Option<&str>) -> HashMap<String, String> {
    let mut values = HashMap::new();

    for var in SYSTEM_VARIABLES {
        values.insert(var.to_string(), get_system_variable_value(var, clipboard));
    }

    values
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_variables() {
        let content = "解释 {{clipboard}} 代码";
        let vars = parse_variables(content);
        assert_eq!(vars.len(), 1);
        assert_eq!(vars[0].name, "clipboard");
        assert_eq!(vars[0].var_type, VarType::System);
    }

    #[test]
    fn test_parse_custom_variable() {
        let content = "翻译为{{目标语言}}";
        let vars = parse_variables(content);
        assert_eq!(vars.len(), 1);
        assert_eq!(vars[0].name, "目标语言");
        assert_eq!(vars[0].var_type, VarType::Custom);
    }

    #[test]
    fn test_replace_variables() {
        let content = "解释 {{clipboard}}";
        let values = HashMap::from([("clipboard".to_string(), "test code".to_string())]);
        let result = replace_variables(content, values);
        assert_eq!(result, "解释 test code");
    }

    #[test]
    fn test_multiple_variables() {
        let content = "{{date}} {{time}} {{clipboard}}";
        let vars = parse_variables(content);
        assert_eq!(vars.len(), 3);
    }

    #[test]
    fn test_parse_empty_content() {
        let vars = parse_variables("");
        assert!(vars.is_empty());
    }

    #[test]
    fn test_parse_empty_variable_name() {
        let vars = parse_variables("{{}}");
        assert!(vars.is_empty());
    }

    #[test]
    fn test_parse_variable_with_spaces() {
        let vars = parse_variables("{{ name }}");
        assert_eq!(vars.len(), 1);
        assert_eq!(vars[0].name, "name");
    }

    #[test]
    fn test_parse_duplicate_variables() {
        let vars = parse_variables("{{a}}{{a}}");
        assert_eq!(vars.len(), 1);
        assert_eq!(vars[0].name, "a");
    }

    #[test]
    fn test_parse_no_variables() {
        let vars = parse_variables("plain text without variables");
        assert!(vars.is_empty());
    }

    #[test]
    fn test_parse_unicode_variable_names() {
        let vars = parse_variables("{{日本語}}{{한국어}}");
        assert_eq!(vars.len(), 2);
        assert_eq!(vars[0].name, "日本語");
        assert_eq!(vars[1].name, "한국어");
    }

    #[test]
    fn test_replace_multiple_variables() {
        let content = "{{greeting}} {{target}}";
        let values = HashMap::from([
            ("greeting".to_string(), "Hello".to_string()),
            ("target".to_string(), "World".to_string()),
        ]);
        let result = replace_variables(content, values);
        assert_eq!(result, "Hello World");
    }
}