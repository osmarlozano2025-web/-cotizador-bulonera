import { MockDispatchRepository } from "../repositories/mock-dispatch-repository";

const repository = new MockDispatchRepository();

export const getDispatchGuides = repository.getDispatchGuides.bind(repository);
export const getDispatchGuideById = repository.getDispatchGuideById.bind(repository);
export const getDispatchGuideByOrderId = repository.getDispatchGuideByOrderId.bind(repository);
export const createDispatchGuide = repository.createDispatchGuide.bind(repository);
export const updateDispatchGuide = repository.updateDispatchGuide.bind(repository);
export const markDispatchGuideReady = repository.markDispatchGuideReady.bind(repository);
export const assignDriver = repository.assignDriver.bind(repository);
export const assignVehicle = repository.assignVehicle.bind(repository);
export const scheduleDelivery = repository.scheduleDelivery.bind(repository);
export const dispatchOrder = repository.dispatchOrder.bind(repository);
export const confirmDelivery = repository.confirmDelivery.bind(repository);
export const markDeliveryFailed = repository.markDeliveryFailed.bind(repository);
export const rescheduleDelivery = repository.rescheduleDelivery.bind(repository);
export const cancelDispatch = repository.cancelDispatch.bind(repository);
export const getDispatchHistory = repository.getDispatchHistory.bind(repository);
export const getDispatchReferenceData = repository.getReferenceData.bind(repository);
