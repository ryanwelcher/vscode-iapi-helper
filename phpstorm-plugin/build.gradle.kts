plugins {
    id("java")
    id("org.jetbrains.intellij") version "1.17.2"
    id("org.jetbrains.kotlin.jvm") version "1.9.22"
}

group = "com.ryanwelcher"
version = "1.0.0"

repositories {
    mavenCentral()
}

intellij {
    version.set("2023.3")
    type.set("PS") // PHPStorm

    plugins.set(listOf("com.jetbrains.php:233.11799.297", "JavaScript", "HtmlTools"))
}

tasks {
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    patchPluginXml {
        sinceBuild.set("233")
        untilBuild.set("241.*")
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }
}
