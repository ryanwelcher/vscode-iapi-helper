package com.ryanwelcher.wpinteractivity.listeners

import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileContentChangeEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.psi.PsiManager
import com.ryanwelcher.wpinteractivity.parsers.JsStoreParser
import com.ryanwelcher.wpinteractivity.parsers.PhpStoreParser
import com.ryanwelcher.wpinteractivity.services.StoreService

class StoreFileListener : BulkFileListener {
    private val jsParser = JsStoreParser()
    private val phpParser = PhpStoreParser()

    override fun after(events: MutableList<out VFileEvent>) {
        for (event in events) {
            if (event is VFileContentChangeEvent) {
                val file = event.file
                val project = findProjectForFile(file) ?: continue
                val storeService = project.getService(StoreService::class.java) ?: continue

                val psiFile = PsiManager.getInstance(project).findFile(file) ?: continue

                when (file.extension) {
                    "js", "ts" -> {
                        storeService.removeStoresByFile(file.path)
                        jsParser.parseFile(psiFile).forEach { storeService.addStore(it) }
                    }
                    "php" -> {
                        storeService.removeStoresByFile(file.path)
                        phpParser.parseFile(psiFile).forEach { storeService.addStore(it) }
                    }
                }
            }
        }
    }

    private fun findProjectForFile(file: com.intellij.openapi.vfs.VirtualFile): Project? {
        return ProjectManager.getInstance().openProjects.find { project ->
            project.basePath?.let { file.path.startsWith(it) } ?: false
        }
    }
}
