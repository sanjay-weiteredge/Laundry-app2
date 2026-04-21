import apiClient from './apiRequest';

/**
 * Retrieves all catalogs for the current store.
 * 
 * @returns {Promise<Object>} - The list of catalogs.
 */
export const listAllCatalogs = async () => {
  try {
    console.log('[CatalogService] Fetching all published catalogs...');
    const response = await apiClient.get('catalogs/searching.json', {
      params: {
        query: 'tags-Publish'
      }
    });
    return response.data.objectList;
  } catch (error) {
    console.error('[CatalogService] Error listing catalogs:', error);
    throw error;
  }
};

/**
 * Fetches services based on catalog and category IDs.
 * 
 * @param {string|number} catalogId - The ID of the catalog.
 * @param {string|number} categoryId - The ID of the category.
 * @returns {Promise<Object>} - The list of services/products.
 */
export const getServicesByCategory = async (catalogId, categoryId) => {
  try {
    console.log(`[CatalogService] Fetching items for catalog: ${catalogId}, category: ${categoryId}`);
    const response = await apiClient.get('assetProducts/searching.json', {
      params: {
        query: `catalog.id:${catalogId},catalogCategory.id:${categoryId}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('[CatalogService] Error fetching services by category:', error);
    throw error;
  }
};
