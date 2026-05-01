"use strict";
/**
 * Seeder Utilities
 *
 * Common utility functions used across seeders
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolNames = exports.carModels = exports.lastNames = exports.firstNames = void 0;
exports.generateTcNumber = generateTcNumber;
exports.generatePhoneNumber = generatePhoneNumber;
exports.generatePlateNumber = generatePlateNumber;
exports.getRandomName = getRandomName;
exports.getRandomCarModel = getRandomCarModel;
exports.getRandomSchoolName = getRandomSchoolName;
exports.getRandomYear = getRandomYear;
function generateTcNumber() {
    let tcNumber = '';
    for (let i = 0; i < 11; i++) {
        tcNumber += Math.floor(Math.random() * 10).toString();
    }
    return tcNumber;
}
function generatePhoneNumber() {
    const prefixes = ['505', '506', '507', '530', '531', '532', '533', '534', '535', '536', '537', '538', '539', '540', '541', '542', '543', '544', '545', '546', '547', '548', '549'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `+90 ${prefix} ${number.substring(0, 3)} ${number.substring(3)}`;
}
function generatePlateNumber() {
    const cities = ['01', '06', '34', '35', '16', '07', '42', '31', '58', '63'];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const city = cities[Math.floor(Math.random() * cities.length)];
    const letter1 = letters[Math.floor(Math.random() * letters.length)];
    const letter2 = letters[Math.floor(Math.random() * letters.length)];
    const letter3 = letters[Math.floor(Math.random() * letters.length)];
    const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${city} ${letter1}${letter2}${letter3} ${numbers}`;
}
exports.firstNames = [
    'Ahmet', 'Mehmet', 'Ali', 'Hasan', 'Hüseyin', 'Mustafa', 'Fatma', 'Ayşe', 'Emine', 'Hatice',
    'Zeynep', 'Elif', 'Merve', 'Özlem', 'Selin', 'Burak', 'Cem', 'Emre', 'Kemal', 'Okan',
    'Deniz', 'Seda', 'Pınar', 'Gizem', 'Cansu', 'Berkay', 'Murat', 'Onur', 'Serkan', 'Tolga'
];
exports.lastNames = [
    'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Özkan', 'Aydın', 'Özdemir', 'Arslan', 'Doğan',
    'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özturk', 'Güler', 'Türk', 'Tekin',
    'Akın', 'Yıldız', 'Polat', 'Erdoğan', 'Bulut', 'Aksoy', 'Kaplan', 'Özer', 'Tan', 'Korkmaz'
];
exports.carModels = [
    'Toyota Corolla', 'Honda Civic', 'Volkswagen Golf', 'Ford Focus', 'Renault Clio',
    'Peugeot 308', 'Hyundai i20', 'Nissan Micra', 'Opel Astra', 'Fiat Egea',
    'Skoda Fabia', 'Seat Leon', 'Kia Rio', 'Mazda 3', 'Chevrolet Cruze'
];
exports.schoolNames = [
    'Akademi Sürücü Kursu', 'Başarı Sürücü Kursu', 'Champion Sürücü Kursu', 'Doğuş Sürücü Kursu',
    'Elite Sürücü Kursu', 'Fenerbahçe Sürücü Kursu', 'Galatasaray Sürücü Kursu', 'Hızır Sürücü Kursu',
    'İdeal Sürücü Kursu', 'Jandarma Sürücü Kursu', 'Kartal Sürücü Kursu', 'Lider Sürücu Kursu',
    'Mercedes Sürücü Kursu', 'Nejat Sürücü Kursu', 'Olympos Sürücü Kursu', 'Prestij Sürücü Kursu'
];
function getRandomName() {
    const firstName = exports.firstNames[Math.floor(Math.random() * exports.firstNames.length)];
    const lastName = exports.lastNames[Math.floor(Math.random() * exports.lastNames.length)];
    return `${firstName} ${lastName}`;
}
function getRandomCarModel() {
    return exports.carModels[Math.floor(Math.random() * exports.carModels.length)];
}
function getRandomSchoolName() {
    return exports.schoolNames[Math.floor(Math.random() * exports.schoolNames.length)];
}
function getRandomYear() {
    return Math.floor(Math.random() * (2024 - 2015 + 1)) + 2015;
}
