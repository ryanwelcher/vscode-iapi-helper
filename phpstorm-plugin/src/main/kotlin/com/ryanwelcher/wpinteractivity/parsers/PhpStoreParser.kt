package com.ryanwelcher.wpinteractivity.parsers

import com.intellij.psi.PsiFile
import com.intellij.psi.util.PsiTreeUtil
import com.jetbrains.php.lang.psi.elements.ArrayCreationExpression
import com.jetbrains.php.lang.psi.elements.FunctionReference
import com.jetbrains.php.lang.psi.elements.PhpPsiElement
import com.jetbrains.php.lang.psi.elements.StringLiteralExpression
import com.ryanwelcher.wpinteractivity.models.PropertyInfo
import com.ryanwelcher.wpinteractivity.models.StoreDefinition

class PhpStoreParser {
    fun parseFile(file: PsiFile): List<StoreDefinition> {
        val stores = mutableListOf<StoreDefinition>()
        val functionReferences = PsiTreeUtil.findChildrenOfType(file, FunctionReference::class.java)

        for (ref in functionReferences) {
            if (ref.name == "wp_interactivity_state") {
                val store = parseStoreFromCall(ref, file)
                if (store != null) {
                    stores.add(store)
                }
            }
        }
        return stores
    }

    private fun parseStoreFromCall(ref: FunctionReference, file: PsiFile): StoreDefinition? {
        val parameters = ref.parameters
        if (parameters.size < 2) return null

        val namespace = (parameters[0] as? StringLiteralExpression)?.contents ?: return null
        val stateArray = parameters[1] as? ArrayCreationExpression ?: return null

        val state = mutableMapOf<String, PropertyInfo>()
        extractStateFromArray(stateArray, state)

        return StoreDefinition(
            namespace = namespace,
            state = state,
            sourceFile = file.virtualFile.path,
            sourceType = "php",
            lastModified = file.virtualFile.modificationStamp
        )
    }

    private fun extractStateFromArray(array: ArrayCreationExpression, state: MutableMap<String, PropertyInfo>) {
        for (hashElement in array.hashElements) {
            val key = (hashElement.key as? StringLiteralExpression)?.contents ?: continue
            val value = hashElement.value

            val info = PropertyInfo(
                name = key,
                type = inferType(value),
                isObject = value is ArrayCreationExpression,
                sourceLine = 0 // Can be calculated
            )

            if (value is ArrayCreationExpression) {
                val nestedProperties = mutableMapOf<String, PropertyInfo>()
                extractStateFromArray(value, nestedProperties)
                // info.properties = nestedProperties // Need to handle mutability
            }

            state[key] = info
        }
    }

    private fun inferType(value: PhpPsiElement?): String? {
        return when (value) {
            is StringLiteralExpression -> "string"
            is ArrayCreationExpression -> "array"
            // Add more PHP types if needed
            else -> null
        }
    }
}
