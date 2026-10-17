export interface ParameterField {
    name: string;
    label: string;
    percentage: boolean;
    boolean: boolean;
    nullable: boolean;
}
export const parameterFields: readonly ParameterField[] = [
    {
        "name": "monthlyWage",
        "label": "Sueldo mensual del operario",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "basicWage",
        "label": "SBU vigente (décimo cuarto)",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "employerContributionRate",
        "label": "Aporte patronal IESS",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "reserveFundRate",
        "label": "Fondo de reserva",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "applyReserveFund",
        "label": "Aplicar fondo de reserva",
        "percentage": false,
        "boolean": true,
        "nullable": false
    },
    {
        "name": "otherPayrollRate",
        "label": "Otras cargas sobre sueldo (IECE/SECAP)",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "theoreticalWorkdaysPerYear",
        "label": "Días laborables teóricos por año",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "nonWorkedHolidaysPerYear",
        "label": "Feriados no trabajados por año",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "vacationWorkdaysPerYear",
        "label": "Días laborables de vacaciones por año",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "otherAbsenceDaysPerYear",
        "label": "Otros días de ausencia por año",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "hoursPerWorkday",
        "label": "Horas de jornada por día",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "productiveFraction",
        "label": "Fracción productiva de las horas",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "nightSurchargeRate",
        "label": "Recargo por hora nocturna (19:00–06:00)",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "holidaySurchargeRate",
        "label": "Recargo por hora en feriado trabajado",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "nationalHolidaysPerYear",
        "label": "Feriados nacionales por año (horarios con feriados)",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "laborHourlyRate",
        "label": "Precio por hora de mano de obra",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "manualRateM2PerHour",
        "label": "m² por hora sin máquina",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "machineRateM2PerHour",
        "label": "m² por hora con máquina",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "supervisorMonthlyCost",
        "label": "Supervisor: costo mensual completo",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "operatorsPerSupervisor",
        "label": "Operarios por supervisor",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "baseEppPerFte",
        "label": "EPP y uniforme base",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "criticalEppPerFte",
        "label": "EPP adicional en área crítica",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "mopCoverageM2",
        "label": "m² que cubre una mopa",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "mopCost",
        "label": "Costo de una mopa",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "mopReplacementsPerMonth",
        "label": "Reposiciones de mopa por mes",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "equipmentMonthly",
        "label": "Equipos: amortización y mantenimiento",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "transportMonthly",
        "label": "Transporte y logística",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "insuranceMonthly",
        "label": "Seguros y permisos",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "administrationRate",
        "label": "Administración (sobre costo operativo)",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "contingencyRate",
        "label": "Contingencia (sobre costo con administración)",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "targetMargin",
        "label": "Margen objetivo sobre venta",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "minimumMargin",
        "label": "Margen mínimo aceptable",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "vatRate",
        "label": "IVA sobre servicio",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "purchaseVatRate",
        "label": "IVA para normalizar precios de compra",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "targetWasteRate",
        "label": "Merma objetivo de químicos",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "uncontrolledWasteRate",
        "label": "Merma estimada sin control",
        "percentage": true,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "flatRatePerM2",
        "label": "Tarifa plana de comparación",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "monthsPerYear",
        "label": "Meses por año",
        "percentage": false,
        "boolean": false,
        "nullable": false
    },
    {
        "name": "defaultTraffic",
        "label": "Tráfico predeterminado",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "defaultScheduleId",
        "label": "Horario predeterminado",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "defaultDaysPerMonth",
        "label": "Días de servicio por mes predeterminados",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "defaultZoneTypeId",
        "label": "Tipo de zona si no hay equivalencia",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "defaultFixtureVisitsPerDay",
        "label": "Atenciones por día",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "defaultMinutesPerFixture",
        "label": "Minutos por aparato",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "defaultSolutionLitersPerFixture",
        "label": "Litros de solución por aparato",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "defaultPaperSoapPerFixtureMonthly",
        "label": "Papel y jabón por aparato al mes",
        "percentage": false,
        "boolean": false,
        "nullable": true
    },
    {
        "name": "fixtureDefaultsExcludeFloor",
        "label": "Los tiempos predeterminados no incluyen el piso",
        "percentage": false,
        "boolean": true,
        "nullable": false
    }
] as const;
