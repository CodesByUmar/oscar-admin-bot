// const fs = require('fs');

// const raw = fs.readFileSync('./firestore_data.json', 'utf8');
// const data = JSON.parse(raw);

// // 1. Categories: name_uz/ru/en → name: {uz, ru, en}
// const newCategories = {};
// for (const [key, cat] of Object.entries(data.categories)) {
//   const { name_uz, name_ru, name_en, ...rest } = cat;
//   newCategories[key] = {
//     ...rest,
//     name: { uz: name_uz || '', ru: name_ru || '', en: name_en || '' },
//   };
// }

// // 2. Build category id → name i18n map
// const categoryMap = {};
// for (const cat of Object.values(data.categories)) {
//   categoryMap[cat.id] = {
//     uz: cat.name_uz || '',
//     ru: cat.name_ru || '',
//     en: cat.name_en || '',
//   };
// }

// // 3. Products: name_uz/ru/en → name: {uz, ru, en}, category int → {uz, ru, en}
// const newProducts = {};
// for (const [key, prod] of Object.entries(data.products)) {
//   const { name_uz, name_ru, name_en, category, ...rest } = prod;
//   newProducts[key] = {
//     ...rest,
//     name: { uz: name_uz || '', ru: name_ru || '', en: name_en || '' },
//     category: categoryMap[category] || { uz: 'Boshqalar', ru: 'Другое', en: 'Other' },
//   };
// }

// const result = { categories: newCategories, products: newProducts };
// fs.writeFileSync('./firestore_data.json', JSON.stringify(result, null, 2), 'utf8');
// console.log(`✅ Tayyor! Kategoriyalar: ${Object.keys(newCategories).length}, Mahsulotlar: ${Object.keys(newProducts).length}`);
