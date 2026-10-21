/* Unit conversion for local market quotes. All solver prices are per kilogram AS FED.
   These are unit conversions, not FX conversions. */
(function(root){
'use strict';
const PRICE_UNITS=Object.freeze({kg:1,tonne:1000,bag25:25,bag50:50,bag100:100});
function toPricePerKgAsFed(quotedPrice,unit='kg'){
 if(typeof quotedPrice!=='number'||!Number.isFinite(quotedPrice)||quotedPrice<0)throw new Error('Price must be a finite non-negative number');
 if(!Object.hasOwn(PRICE_UNITS,unit))throw new Error('Unsupported as-fed price unit');
 return quotedPrice/PRICE_UNITS[unit];
}
function fromPricePerKgAsFed(pricePerKg,unit='kg'){
 if(typeof pricePerKg!=='number'||!Number.isFinite(pricePerKg)||pricePerKg<0)throw new Error('Price must be a finite non-negative number');
 if(!Object.hasOwn(PRICE_UNITS,unit))throw new Error('Unsupported as-fed price unit');
 return pricePerKg*PRICE_UNITS[unit];
}
function asFedToDM(weightKgAsFed,dmPct){
 if(!Number.isFinite(weightKgAsFed)||weightKgAsFed<0||!Number.isFinite(dmPct)||dmPct<=0||dmPct>100)throw new Error('Invalid mass or dry matter');
 return weightKgAsFed*dmPct/100;
}
function dmToAsFed(weightKgDM,dmPct){
 if(!Number.isFinite(weightKgDM)||weightKgDM<0||!Number.isFinite(dmPct)||dmPct<=0||dmPct>100)throw new Error('Invalid mass or dry matter');
 return weightKgDM/(dmPct/100);
}
function nutrientDmPctToAsFedPct(nutrientPctDM,dmPct){
 if(!Number.isFinite(nutrientPctDM)||nutrientPctDM<0||nutrientPctDM>100||!Number.isFinite(dmPct)||dmPct<=0||dmPct>100)throw new Error('Invalid nutrient or dry matter');
 return nutrientPctDM*dmPct/100;
}
function nutrientAsFedPctToDmPct(nutrientPctAF,dmPct){
 if(!Number.isFinite(nutrientPctAF)||nutrientPctAF<0||!Number.isFinite(dmPct)||dmPct<=0||dmPct>100||nutrientPctAF>dmPct+1e-9)throw new Error('Nutrient as-fed cannot exceed dry matter');
 return nutrientPctAF/(dmPct/100);
}
const API={PRICE_UNITS,toPricePerKgAsFed,fromPricePerKgAsFed,asFedToDM,dmToAsFed,nutrientDmPctToAsFedPct,nutrientAsFedPctToDmPct};
root.RationUnits=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
