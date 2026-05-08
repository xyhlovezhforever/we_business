//! Build script for generating gRPC client code from proto files
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 编译 Tool Service proto（客户端）
    tonic_build::configure()
        .build_server(false)
        .build_client(true)
        .compile(&["proto/tool_service.proto"], &["proto/"])?;

    // 编译 Orchestrator Service proto（服务端）
    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .compile(&["proto/task_orchestrator_service.proto"], &["proto/"])?;

    // 编译 LLM Service proto（客户端）
    tonic_build::configure()
        .build_server(false)
        .build_client(true)
        .compile(&["proto/llm_service.proto"], &["proto/"])?;

    // 编译 Database Service proto（客户端和服务端）
    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .compile(&["proto/database.proto"], &["proto/"])?;

    // 编译 Kafka Service proto（客户端）
    tonic_build::configure()
        .build_server(false)
        .build_client(true)
        .compile(&["proto/kafka_service.proto"], &["proto/"])?;

    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=proto/");
    Ok(())
}
