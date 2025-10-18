enum ListingPlatforms {
  GLOBAL = 10,
  ETSY = 1,
  SHOPIFY = 2
}

type ListingPlatformsKeys = keyof typeof ListingPlatforms

enum ListingSettingTypes {
  FIELDSORDER = 1,
  COLOR = 2,
  LANGUAGE = 3
}

type ListingSettingTypesKeys = keyof typeof ListingSettingTypes

enum ListingScheduleStatus {
  PENDING = 10,
  ONGOING = 1,
  FAILED = 2,
  SUCCESS = 3,
  CANCELED = 4
}

export {
  ListingPlatforms,
  ListingPlatformsKeys,
  ListingSettingTypes,
  ListingSettingTypesKeys,
  ListingScheduleStatus
}
