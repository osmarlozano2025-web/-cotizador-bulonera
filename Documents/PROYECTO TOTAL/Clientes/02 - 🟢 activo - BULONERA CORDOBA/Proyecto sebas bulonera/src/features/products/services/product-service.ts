import { getProductReferenceData, getProductSeedList } from "../data/mock-products";
import { MockProductRepository } from "../repositories/mock-product-repository";
import type { ProductReferenceData } from "../types";

const repository = new MockProductRepository(getProductSeedList());

export function getProductReferenceDataService(): ProductReferenceData {
  return getProductReferenceData();
}

export const getProducts = repository.getProducts.bind(repository);
export const getProductById = repository.getProductById.bind(repository);
export const getProductDetailData = repository.getProductDetailData.bind(repository);
export const getProductLookup = repository.getProductLookup.bind(repository);
export const createProduct = repository.createProduct.bind(repository);
export const updateProduct = repository.updateProduct.bind(repository);
