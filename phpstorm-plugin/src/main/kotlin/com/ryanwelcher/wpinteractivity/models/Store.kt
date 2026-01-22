package com.ryanwelcher.wpinteractivity.models

data class StoreDefinition(
    val namespace: String,
    val state: MutableMap<String, PropertyInfo> = mutableMapOf(),
    val actions: MutableMap<String, MethodInfo> = mutableMapOf(),
    val callbacks: MutableMap<String, MethodInfo> = mutableMapOf(),
    val sourceFile: String,
    val sourceType: String, // "php" or "javascript"
    var lastModified: Long
)

data class PropertyInfo(
    val name: String,
    val type: String? = null,
    val isObject: Boolean = false,
    val properties: MutableMap<String, PropertyInfo>? = null,
    val sourceLine: Int? = null
)

data class MethodInfo(
    val name: String,
    val parameters: List<String>? = null,
    val returnType: String? = null,
    val sourceLine: Int? = null
)
