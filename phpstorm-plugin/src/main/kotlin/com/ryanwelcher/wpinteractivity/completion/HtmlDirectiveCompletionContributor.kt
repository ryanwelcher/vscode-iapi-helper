package com.ryanwelcher.wpinteractivity.completion

import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.patterns.PlatformPatterns
import com.intellij.patterns.XmlPatterns
import com.intellij.psi.xml.XmlAttribute
import com.intellij.psi.xml.XmlTag
import com.intellij.util.ProcessingContext

class HtmlDirectiveCompletionContributor : CompletionContributor() {
    private val directives = listOf(
        "data-wp-interactive",
        "data-wp-context",
        "data-wp-bind",
        "data-wp-class",
        "data-wp-style",
        "data-wp-text",
        "data-wp-on",
        "data-wp-on-async",
        "data-wp-on-window",
        "data-wp-on-async-window",
        "data-wp-on-document",
        "data-wp-on-async-document",
        "data-wp-watch",
        "data-wp-init",
        "data-wp-run",
        "data-wp-each"
    )

    init {
        extend(
            CompletionType.BASIC,
            XmlPatterns.xmlAttributeValue().withParent(XmlAttribute::class.java),
            object : CompletionProvider<CompletionParameters>() {
                override fun addCompletions(
                    parameters: CompletionParameters,
                    context: ProcessingContext,
                    result: CompletionResultSet
                ) {
                    val attribute = parameters.position.parent as? XmlAttribute ?: return
                    val attrName = attribute.name
                    if (!attrName.startsWith("data-wp-")) return

                    val tag = attribute.parent
                    val namespace = findNamespace(tag) ?: return

                    val project = parameters.editor.project ?: return
                    val storeService = project.getService(com.ryanwelcher.wpinteractivity.services.StoreService::class.java)
                    val store = storeService?.getStore(namespace) ?: return

                    if (attrName == "data-wp-text" || attrName.startsWith("data-wp-bind--")) {
                        store.state.keys.forEach { result.addElement(LookupElementBuilder.create("state.$it")) }
                    } else if (attrName.startsWith("data-wp-on--")) {
                        store.actions.keys.forEach { result.addElement(LookupElementBuilder.create("actions.$it")) }
                    }
                }
            }
        )

        extend(
            CompletionType.BASIC,
            PlatformPatterns.psiElement().withParent(XmlTag::class.java),
            object : CompletionProvider<CompletionParameters>() {
                override fun addCompletions(
                    parameters: CompletionParameters,
                    context: ProcessingContext,
                    result: CompletionResultSet
                ) {
                    val prefix = result.prefixMatcher.prefix
                    if (prefix.startsWith("data-w")) {
                        directives.forEach { result.addElement(LookupElementBuilder.create(it)) }
                    }
                }
            }
        )
    }

    private fun findNamespace(tag: XmlTag): String? {
        var current: XmlTag? = tag
        while (current != null) {
            val interactive = current.getAttributeValue("data-wp-interactive")
            if (interactive != null) return interactive
            current = current.parentTag
        }
        return null
    }
}
