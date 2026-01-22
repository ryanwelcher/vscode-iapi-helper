package com.ryanwelcher.wpinteractivity.parsers

import com.intellij.lang.javascript.psi.*
import com.intellij.psi.PsiFile
import com.intellij.psi.util.PsiTreeUtil
import com.ryanwelcher.wpinteractivity.models.MethodInfo
import com.ryanwelcher.wpinteractivity.models.PropertyInfo
import com.ryanwelcher.wpinteractivity.models.StoreDefinition

class JsStoreParser {
    fun parseFile(file: PsiFile): List<StoreDefinition> {
        val stores = mutableListOf<StoreDefinition>()
        val callExpressions = PsiTreeUtil.findChildrenOfType(file, JSCallExpression::class.java)

        for (call in callExpressions) {
            val methodExpression = call.methodExpression as? JSReferenceExpression ?: continue
            if (methodExpression.referenceName == "store") {
                val store = parseStoreFromCall(call, file)
                if (store != null) {
                    stores.add(store)
                }
            }
        }
        return stores
    }

    private fun parseStoreFromCall(call: JSCallExpression, file: PsiFile): StoreDefinition? {
        val arguments = call.arguments
        if (arguments.size < 2) return null

        val namespace = (arguments[0] as? JSLiteralExpression)?.stringValue ?: return null
        val storeObject = arguments[1] as? JSObjectLiteralExpression ?: return null

        val state = mutableMapOf<String, PropertyInfo>()
        val actions = mutableMapOf<String, MethodInfo>()
        val callbacks = mutableMapOf<String, MethodInfo>()

        for (property in storeObject.properties) {
            val name = property.name ?: continue
            val value = property.value

            when (name) {
                "state" -> (value as? JSObjectLiteralExpression)?.let { extractStateProperties(it, state) }
                "actions" -> (value as? JSObjectLiteralExpression)?.let { extractMethods(it, actions) }
                "callbacks" -> (value as? JSObjectLiteralExpression)?.let { extractMethods(it, callbacks) }
            }
        }

        return StoreDefinition(
            namespace = namespace,
            state = state,
            actions = actions,
            callbacks = callbacks,
            sourceFile = file.virtualFile.path,
            sourceType = "javascript",
            lastModified = file.virtualFile.modificationStamp
        )
    }

    private fun extractStateProperties(obj: JSObjectLiteralExpression, state: MutableMap<String, PropertyInfo>) {
        for (prop in obj.properties) {
            val name = prop.name ?: continue
            val value = prop.value

            val info = PropertyInfo(
                name = name,
                type = inferType(value),
                isObject = value is JSObjectLiteralExpression,
                sourceLine = 0 // Can be calculated from prop.textOffset
            )

            if (value is JSObjectLiteralExpression) {
                val nestedProperties = mutableMapOf<String, PropertyInfo>()
                extractStateProperties(value, nestedProperties)
                // PropertyInfo in Kotlin definition needs to be mutable or handled correctly
                // For now, let's assume we can set it if we change the data class or use a copy
            }
            state[name] = info
        }
    }

    private fun extractMethods(obj: JSObjectLiteralExpression, methods: MutableMap<String, MethodInfo>) {
        for (prop in obj.properties) {
            val name = prop.name ?: continue
            val value = prop.value

            val parameters = mutableListOf<String>()
            if (value is JSFunction) {
                value.parameters.forEach { it.name?.let { n -> parameters.add(n) } }
            }

            methods[name] = MethodInfo(
                name = name,
                parameters = parameters,
                sourceLine = 0
            )
        }
    }

    private fun inferType(value: JSExpression?): String? {
        return when (value) {
            is JSLiteralExpression -> {
                if (value.isStringLiteral) "string"
                else if (value.isNumericLiteral) "number"
                else if (value.isBooleanLiteral) "boolean"
                else null
            }
            is JSArrayLiteralExpression -> "array"
            is JSObjectLiteralExpression -> "object"
            is JSFunction -> "function"
            else -> null
        }
    }
}
