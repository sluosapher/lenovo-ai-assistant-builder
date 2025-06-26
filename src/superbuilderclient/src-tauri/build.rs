use std::env;
use std::fs;
use std::path::Path;
fn main() {
    tauri_build::build();
    tonic_build::compile_protos("../../shared/superbuilder_middleware.proto")
        .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
    let schema_path = Path::new("../../shared/AssistantModelConfigSchema.json");
    let schema_content = fs::read_to_string(schema_path)
        .unwrap_or_else(|e| panic!("Failed to read JSON schema file: {:?}", e));
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("schema.json");
    fs::write(&dest_path, schema_content).unwrap();
}
