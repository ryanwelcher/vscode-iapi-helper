package com.ryanwelcher.wpinteractivity.inspections

import com.intellij.codeInspection.LocalInspectionTool
import com.intellij.codeInspection.ProblemsHolder
import com.intellij.psi.PsiElementVisitor
import com.intellij.psi.xml.XmlAttribute
import com.intellij.psi.xml.XmlTag

class DuplicateDirectiveInspection : LocalInspectionTool() {
    override fun buildVisitor(holder: ProblemsHolder, isOnTheFly: Boolean): PsiElementVisitor {
        return object : com.intellij.psi.XmlElementVisitor() {
            override fun visitXmlTag(tag: XmlTag) {
                val attributes = tag.attributes
                val seenDirectives = mutableSetOf<String>()

                for (attr in attributes) {
                    val name = attr.name
                    if (name.startsWith("data-wp-")) {
                        if (seenDirectives.contains(name)) {
                            // Check if duplicates are allowed for this specific directive
                            if (!allowsDuplicates(name)) {
                                holder.registerProblem(attr, "Duplicate WordPress Interactivity API directive: $name")
                            }
                        }
                        seenDirectives.add(name)
                    }
                }
            }
        }
    }

    private fun allowsDuplicates(name: String): Boolean {
        // Core directives that don't allow duplicates
        val noDuplicates = listOf(
            "data-wp-interactive",
            "data-wp-context",
            "data-wp-text"
        )
        if (noDuplicates.contains(name)) return false

        // Parameterized directives (bind, class, style, on) allow duplicates as long as they have different suffixes
        // This is a simplified check
        return true
    }
}
