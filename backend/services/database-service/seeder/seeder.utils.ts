/**
 * Seeder Utilities
 *
 * Common utility functions used across seeders
 */

export function generateTcNumber(): string {
  let tcNumber = ''
  for (let i = 0; i < 11; i++) {
    tcNumber += Math.floor(Math.random() * 10).toString()
  }
  return tcNumber
}

export function generatePhoneNumber(): string {
  const prefixes = ['505', '506', '507', '530', '531', '532', '533', '534', '535', '536', '537', '538', '539', '540', '541', '542', '543', '544', '545', '546', '547', '548', '549']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `+90 ${prefix} ${number.substring(0, 3)} ${number.substring(3)}`
}

export function generatePlateNumber(): string {
  const cities = ['01', '06', '34', '35', '16', '07', '42', '31', '58', '63']
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const city = cities[Math.floor(Math.random() * cities.length)]
  const letter1 = letters[Math.floor(Math.random() * letters.length)]
  const letter2 = letters[Math.floor(Math.random() * letters.length)]
  const letter3 = letters[Math.floor(Math.random() * letters.length)]
  const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${city} ${letter1}${letter2}${letter3} ${numbers}`
}

export const firstNames = [
  'Ahmet', 'Mehmet', 'Ali', 'Hasan', 'Hüseyin', 'Mustafa', 'Fatma', 'Ayşe', 'Emine', 'Hatice',
  'Zeynep', 'Elif', 'Merve', 'Özlem', 'Selin', 'Burak', 'Cem', 'Emre', 'Kemal', 'Okan',
  'Deniz', 'Seda', 'Pınar', 'Gizem', 'Cansu', 'Berkay', 'Murat', 'Onur', 'Serkan', 'Tolga'
]

export const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Özkan', 'Aydın', 'Özdemir', 'Arslan', 'Doğan',
  'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özturk', 'Güler', 'Türk', 'Tekin',
  'Akın', 'Yıldız', 'Polat', 'Erdoğan', 'Bulut', 'Aksoy', 'Kaplan', 'Özer', 'Tan', 'Korkmaz'
]

export const carModels = [
  'Toyota Corolla', 'Honda Civic', 'Volkswagen Golf', 'Ford Focus', 'Renault Clio',
  'Peugeot 308', 'Hyundai i20', 'Nissan Micra', 'Opel Astra', 'Fiat Egea',
  'Skoda Fabia', 'Seat Leon', 'Kia Rio', 'Mazda 3', 'Chevrolet Cruze'
]

export const schoolNames = [
  'Akademi Sürücü Kursu', 'Başarı Sürücü Kursu', 'Champion Sürücü Kursu', 'Doğuş Sürücü Kursu',
  'Elite Sürücü Kursu', 'Fenerbahçe Sürücü Kursu', 'Galatasaray Sürücü Kursu', 'Hızır Sürücü Kursu',
  'İdeal Sürücü Kursu', 'Jandarma Sürücü Kursu', 'Kartal Sürücü Kursu', 'Lider Sürücu Kursu',
  'Mercedes Sürücü Kursu', 'Nejat Sürücü Kursu', 'Olympos Sürücü Kursu', 'Prestij Sürücü Kursu'
]

export function getRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  return `${firstName} ${lastName}`
}

export function getRandomCarModel(): string {
  return carModels[Math.floor(Math.random() * carModels.length)]
}

export function getRandomSchoolName(): string {
  return schoolNames[Math.floor(Math.random() * schoolNames.length)]
}

export function getRandomYear(): number {
  return Math.floor(Math.random() * (2024 - 2015 + 1)) + 2015
}

export interface SeededUsers {
  admins: any[]
  owners: any[]
  managers: any[]
}

export interface SeededSchoolData {
  schools: any[]
  subscriptions: any[]
  cars: any[]
  students: any[]
}