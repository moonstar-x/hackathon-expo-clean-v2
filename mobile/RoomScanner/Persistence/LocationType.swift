import Foundation

/// What kind of space a location is, chosen on the Save sheet. Stored in `Location.typeRaw`.
///
/// Raw values are persisted, so don't rename them. Add new cases to a category's `types`.
enum LocationType: String, CaseIterable, Identifiable, Sendable {
    // Healthcare
    case operatingRoom, patientRoom, intensiveCareUnit, emergencyRoom, examRoom, recoveryRoom,
         clinicalLaboratory, imagingRoom, pharmacy, sterilizationRoom, nursingStation, waitingRoom
    // Education
    case classroom, schoolLaboratory, library, auditorium, gymnasium, teachersLounge, daycare
    // Office
    case office, openOffice, meetingRoom, reception, breakRoom, copyRoom, serverRoom
    // Common areas
    case hallway, lobby, entrance, stairwell, elevator, bathroom, lockerRoom
    // Residential
    case livingRoom, bedroom, kitchen, diningRoom, laundryRoom, garage, balcony
    // Hospitality and retail
    case hotelRoom, restaurant, cafeteria, commercialKitchen, retailStore, showroom, eventHall
    // Industrial and services
    case warehouse, storageRoom, productionArea, loadingDock, mechanicalRoom, janitorCloset, parking
    // Other
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .operatingRoom: String(localized: .locationTypeOperatingRoom)
        case .patientRoom: String(localized: .locationTypePatientRoom)
        case .intensiveCareUnit: String(localized: .locationTypeIntensiveCareUnit)
        case .emergencyRoom: String(localized: .locationTypeEmergencyRoom)
        case .examRoom: String(localized: .locationTypeExamRoom)
        case .recoveryRoom: String(localized: .locationTypeRecoveryRoom)
        case .clinicalLaboratory: String(localized: .locationTypeClinicalLaboratory)
        case .imagingRoom: String(localized: .locationTypeImagingRoom)
        case .pharmacy: String(localized: .locationTypePharmacy)
        case .sterilizationRoom: String(localized: .locationTypeSterilizationRoom)
        case .nursingStation: String(localized: .locationTypeNursingStation)
        case .waitingRoom: String(localized: .locationTypeWaitingRoom)
        case .classroom: String(localized: .locationTypeClassroom)
        case .schoolLaboratory: String(localized: .locationTypeSchoolLaboratory)
        case .library: String(localized: .locationTypeLibrary)
        case .auditorium: String(localized: .locationTypeAuditorium)
        case .gymnasium: String(localized: .locationTypeGymnasium)
        case .teachersLounge: String(localized: .locationTypeTeachersLounge)
        case .daycare: String(localized: .locationTypeDaycare)
        case .office: String(localized: .locationTypeOffice)
        case .openOffice: String(localized: .locationTypeOpenOffice)
        case .meetingRoom: String(localized: .locationTypeMeetingRoom)
        case .reception: String(localized: .locationTypeReception)
        case .breakRoom: String(localized: .locationTypeBreakRoom)
        case .copyRoom: String(localized: .locationTypeCopyRoom)
        case .serverRoom: String(localized: .locationTypeServerRoom)
        case .hallway: String(localized: .locationTypeHallway)
        case .lobby: String(localized: .locationTypeLobby)
        case .entrance: String(localized: .locationTypeEntrance)
        case .stairwell: String(localized: .locationTypeStairwell)
        case .elevator: String(localized: .locationTypeElevator)
        case .bathroom: String(localized: .locationTypeBathroom)
        case .lockerRoom: String(localized: .locationTypeLockerRoom)
        case .livingRoom: String(localized: .locationTypeLivingRoom)
        case .bedroom: String(localized: .locationTypeBedroom)
        case .kitchen: String(localized: .locationTypeKitchen)
        case .diningRoom: String(localized: .locationTypeDiningRoom)
        case .laundryRoom: String(localized: .locationTypeLaundryRoom)
        case .garage: String(localized: .locationTypeGarage)
        case .balcony: String(localized: .locationTypeBalcony)
        case .hotelRoom: String(localized: .locationTypeHotelRoom)
        case .restaurant: String(localized: .locationTypeRestaurant)
        case .cafeteria: String(localized: .locationTypeCafeteria)
        case .commercialKitchen: String(localized: .locationTypeCommercialKitchen)
        case .retailStore: String(localized: .locationTypeRetailStore)
        case .showroom: String(localized: .locationTypeShowroom)
        case .eventHall: String(localized: .locationTypeEventHall)
        case .warehouse: String(localized: .locationTypeWarehouse)
        case .storageRoom: String(localized: .locationTypeStorageRoom)
        case .productionArea: String(localized: .locationTypeProductionArea)
        case .loadingDock: String(localized: .locationTypeLoadingDock)
        case .mechanicalRoom: String(localized: .locationTypeMechanicalRoom)
        case .janitorCloset: String(localized: .locationTypeJanitorCloset)
        case .parking: String(localized: .locationTypeParking)
        case .other: String(localized: .locationTypeOther)
        }
    }
}

/// Groups the types into sections for the picker.
enum LocationTypeCategory: String, CaseIterable, Identifiable, Sendable {
    case healthcare, education, office, commonAreas, residential, hospitality, industrial, other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .healthcare: String(localized: .locationTypeCategoryHealthcare)
        case .education: String(localized: .locationTypeCategoryEducation)
        case .office: String(localized: .locationTypeCategoryOffice)
        case .commonAreas: String(localized: .locationTypeCategoryCommonAreas)
        case .residential: String(localized: .locationTypeCategoryResidential)
        case .hospitality: String(localized: .locationTypeCategoryHospitality)
        case .industrial: String(localized: .locationTypeCategoryIndustrial)
        case .other: String(localized: .locationTypeCategoryOther)
        }
    }

    var types: [LocationType] {
        switch self {
        case .healthcare:
            [.operatingRoom, .patientRoom, .intensiveCareUnit, .emergencyRoom, .examRoom, .recoveryRoom,
             .clinicalLaboratory, .imagingRoom, .pharmacy, .sterilizationRoom, .nursingStation, .waitingRoom]
        case .education:
            [.classroom, .schoolLaboratory, .library, .auditorium, .gymnasium, .teachersLounge, .daycare]
        case .office:
            [.office, .openOffice, .meetingRoom, .reception, .breakRoom, .copyRoom, .serverRoom]
        case .commonAreas:
            [.hallway, .lobby, .entrance, .stairwell, .elevator, .bathroom, .lockerRoom]
        case .residential:
            [.livingRoom, .bedroom, .kitchen, .diningRoom, .laundryRoom, .garage, .balcony]
        case .hospitality:
            [.hotelRoom, .restaurant, .cafeteria, .commercialKitchen, .retailStore, .showroom, .eventHall]
        case .industrial:
            [.warehouse, .storageRoom, .productionArea, .loadingDock, .mechanicalRoom, .janitorCloset, .parking]
        case .other:
            [.other]
        }
    }
}
