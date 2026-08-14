import { MockLogisticsRepository } from "../repositories/mock-logistics-repository";

const repository = new MockLogisticsRepository();

export const getOperationalOrders = repository.getOperationalOrders.bind(repository);
export const getOperationalOrderById = repository.getOperationalOrderById.bind(repository);
export const startOrderPreparation = repository.startOrderPreparation.bind(repository);
export const updatePreparedQuantity = repository.updatePreparedQuantity.bind(repository);
export const registerMissingItem = repository.registerMissingItem.bind(repository);
export const completeOrderPreparation = repository.completeOrderPreparation.bind(repository);
export const markOrderReadyForDispatch = repository.markOrderReadyForDispatch.bind(repository);
export const getLogisticsSummary = repository.getLogisticsSummary.bind(repository);
export const getLogisticsHistory = repository.getLogisticsHistory.bind(repository);

