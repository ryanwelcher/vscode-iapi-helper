package com.ryanwelcher.wpinteractivity.services

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.ryanwelcher.wpinteractivity.models.StoreDefinition
import java.util.concurrent.ConcurrentHashMap

@Service(Service.Level.PROJECT)
class StoreService(val project: Project) {
    private val stores = ConcurrentHashMap<String, StoreDefinition>()

    fun addStore(store: StoreDefinition) {
        val existing = stores[store.namespace]
        if (existing == null || store.lastModified >= existing.lastModified) {
            stores[store.namespace] = store
        }
    }

    fun removeStore(namespace: String) {
        stores.remove(namespace)
    }

    fun removeStoresByFile(filePath: String) {
        val namespacesToRemove = stores.filterValues { it.sourceFile == filePath }.keys
        namespacesToRemove.forEach { stores.remove(it) }
    }

    fun getStore(namespace: String): StoreDefinition? = stores[namespace]

    fun getAllStores(): List<StoreDefinition> = stores.values.toList()

    fun clear() {
        stores.clear()
    }
}
