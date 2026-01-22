package com.ryanwelcher.wpinteractivity.completion

import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.patterns.PlatformPatterns
import com.intellij.psi.PsiElement
import com.intellij.util.ProcessingContext
import com.jetbrains.php.lang.psi.elements.PhpPsiElement

class PhpDirectiveCompletionContributor : CompletionContributor() {
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
            PlatformPatterns.psiElement(),
            object : CompletionProvider<CompletionParameters>() {
                override fun addCompletions(
                    parameters: CompletionParameters,
                    context: ProcessingContext,
                    result: CompletionResultSet
                ) {
                    val element = parameters.position
                    // In PHP files, we're likely inside an HTML block or a string
                    // This is a simplified check
                    val text = element.text
                    if (text.startsWith("data-w")) {
                         directives.forEach { result.addElement(LookupElementBuilder.create(it)) }
                    }
                }
            }
        )
    }
}
