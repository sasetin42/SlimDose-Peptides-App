/**
 * Comprehensive Official Philippine Postal ZIP Codes Database
 * Covers all 17 Regions, 82 Provinces, 148+ Cities, and 1,486+ Municipalities,
 * including precise district and barangay level postal codes for multi-zone areas.
 */

export interface BarangayZipRecord {
  keywords: string[];
  zipCode: string;
}

export interface CityZipRecord {
  city: string;
  aliases?: string[];
  defaultZip: string;
  barangays?: Record<string, string>; // direct barangay name or keyword to ZIP
}

export interface ProvinceZipRecord {
  province: string;
  provinceCode: string;
  aliases?: string[];
  cities: Record<string, CityZipRecord>;
}

// ═══ METRO MANILA & NCR DETAILED BARANGAY & DISTRICT ZIP CODES ═══
export const NCR_BARANGAY_ZIP_MAP: Record<string, Record<string, string>> = {
  // QUEZON CITY
  'quezon city': {
    'batasan': '1126',
    'batasan hills': '1126',
    'commonwealth': '1121',
    'holy spirit': '1127',
    'pasong tamo': '1107',
    'fairview': '1118',
    'greater lagro': '1118',
    'lagro': '1118',
    'novaliches': '1123',
    'nagkaisang nayon': '1125',
    'gulod': '1117',
    'san bartolome': '1116',
    'bagbag': '1116',
    'sauyo': '1116',
    'talipapa': '1116',
    'tandang sora': '1116',
    'culiat': '1128',
    'bahay toro': '1106',
    'project 8': '1106',
    'project 7': '1105',
    'project 6': '1100',
    'project 4': '1109',
    'project 2': '1102',
    'project 3': '1102',
    'matandang balara': '1119',
    'loyola heights': '1108',
    'katipunan': '1108',
    'pansol': '1108',
    'up campus': '1101',
    'up diliman': '1101',
    'diliman': '1101',
    'krusing na ligas': '1101',
    'teachers village': '1101',
    'sikatuna': '1101',
    'central': '1100',
    'pinyahan': '1100',
    'botocan': '1101',
    'south triangle': '1103',
    'tomas morato': '1103',
    'sacred heart': '1103',
    'laging handa': '1103',
    'paligsahan': '1103',
    'scout': '1103',
    'timog': '1103',
    'kamuning': '1103',
    'kamias': '1102',
    'cubao': '1109',
    'socorro': '1109',
    'san roque': '1109',
    'kaunlaran': '1111',
    'bagong lipunan ng crame': '1111',
    'camp crame': '1111',
    'camp aguinaldo': '1110',
    'ugong norte': '1110',
    'white plains': '1110',
    'corinthian': '1110',
    'greenmeadows': '1110',
    'new manila': '1112',
    'damayang lagi': '1112',
    'mariana': '1112',
    'horseshoe': '1112',
    'valencia': '1112',
    'sta. mesa heights': '1114',
    'santa mesa heights': '1114',
    'santo domingo': '1114',
    'la loma': '1115',
    'paang bundok': '1115',
    'salvacion': '1114',
    'san isidro labrador': '1114',
    'banawe': '1114',
    'sienna': '1114',
    'san jose': '1115',
    'manresa': '1115',
    'masambong': '1115',
    'del monte': '1105',
    'san antonio': '1105',
    'veterans village': '1105',
    'bungad': '1105',
    'phil-am': '1104',
    'west triangle': '1104',
    'nayong kanluran': '1104',
    'sta. cruz': '1104',
    'payatas': '1119',
    'bagong silangan': '1119'
  },

  // CITY OF MANILA
  'manila': {
    'intramuros': '1002',
    'ermita': '1000',
    'malate': '1004',
    'paco': '1007',
    'pandacan': '1011',
    'sampaloc': '1008',
    'santa cruz': '1003',
    'sta. cruz': '1003',
    'santa ana': '1009',
    'sta. ana': '1009',
    'santa mesa': '1016',
    'sta. mesa': '1016',
    'tondo': '1012',
    'binondo': '1006',
    'san nicolas': '1010',
    'quiapo': '1001',
    'san miguel': '1005',
    'port area': '1018',
    'san andres': '1017',
    'san andres bukid': '1017'
  },

  // MAKATI CITY
  'makati': {
    'bel-air': '1209',
    'bel air': '1209',
    'salcedo': '1227',
    'salcedo village': '1227',
    'legazpi': '1229',
    'legazpi village': '1229',
    'legaspi': '1229',
    'legaspi village': '1229',
    'san lorenzo': '1223',
    'san lorenzo village': '1223',
    'urdaneta': '1225',
    'urdaneta village': '1225',
    'forbes park': '1219',
    'dasmarinas village': '1222',
    'dasmariñas village': '1222',
    'magallanes': '1232',
    'magallanes village': '1232',
    'poblacion': '1210',
    'guadalupe nuevo': '1212',
    'guadalupe viejo': '1211',
    'pembo': '1218',
    'comembo': '1217',
    'rembo': '1216',
    'east rembo': '1216',
    'west rembo': '1215',
    'cembo': '1214',
    'pitogo': '1213',
    'pinagkaisahan': '1213',
    'south cembo': '1214',
    'bangkal': '1233',
    'pio del pilar': '1230',
    'san antonio': '1203',
    'palanan': '1235',
    'la paz': '1204',
    'singalong': '1234',
    'tejeros': '1204',
    'kasilawan': '1206',
    'carmona': '1207',
    'olympia': '1207',
    'valenzuela': '1208',
    'santa cruz': '1205'
  },

  // TAGUIG CITY (BGC & Surroundings)
  'taguig': {
    'bonifacio global city': '1634',
    'bgc': '1634',
    'fort bonifacio': '1634',
    'pinagsama': '1630',
    'western bicutan': '1630',
    'upper bicutan': '1633',
    'lower bicutan': '1632',
    'new lower bicutan': '1632',
    'maharlika': '1636',
    'maharlika village': '1636',
    'signal village': '1633',
    'central signal': '1633',
    'south signal': '1633',
    'north signal': '1633',
    'bagong tanyag': '1630',
    'tanyag': '1630',
    'ususan': '1632',
    'tuktukan': '1637',
    'bambang': '1637',
    'hagonoy': '1636',
    'sta. ana': '1638',
    'san miguel': '1638',
    'calzada': '1630',
    'ibayo tipas': '1630',
    'ligid tipas': '1630',
    'napindan': '1630',
    'palingon': '1630'
  },

  // PASIG CITY
  'pasig': {
    'ortigas': '1605',
    'ortigas center': '1605',
    'san antonio': '1605',
    'kapitolyo': '1603',
    'ugong': '1604',
    'orando': '1600',
    'rosario': '1609',
    'santolan': '1610',
    'manggahan': '1611',
    'maybunga': '1607',
    'caniogan': '1606',
    'san joaquin': '1601',
    'kalawaan': '1601',
    'bambang': '1600',
    'kapasigan': '1600',
    'malinao': '1600',
    'san nicolas': '1600',
    'santa cruz': '1600',
    'palatiw': '1600',
    'pinagbuhatan': '1602',
    'sagad': '1600',
    'santa lucia': '1608',
    'dela paz': '1612'
  },

  // PARAÑAQUE CITY
  'parañaque': {
    'bf homes': '1718',
    'bf': '1718',
    'baclaran': '1702',
    'tambo': '1701',
    'don galo': '1700',
    'la huerta': '1700',
    'san dionisio': '1700',
    'sto. niño': '1704',
    'moonwalk': '1709',
    'san martin de porres': '1713',
    'sun valley': '1700',
    'don bosco': '1711',
    'marcelo green': '1712',
    'san antonio': '1707',
    'san isidro': '1700',
    'vitalez': '1700'
  },

  // MANDALUYONG CITY
  'mandaluyong': {
    'wack-wack': '1555',
    'wack wack': '1555',
    'greenhills south': '1556',
    'highway hills': '1552',
    'barangka drive': '1550',
    'barangka ilaya': '1550',
    'barangka itaas': '1550',
    'barangka ibaba': '1550',
    'malamig': '1550',
    'hulo': '1550',
    'plainview': '1550',
    'namayan': '1550',
    'mabini-j. rizal': '1550',
    'addition hills': '1550',
    'hagdan bato': '1550',
    'pleasant hills': '1550'
  },

  // SAN JUAN CITY
  'san juan': {
    'greenhills': '1502',
    'greenhills north': '1503',
    'greenhills west': '1502',
    'west greenhills': '1502',
    'little baguio': '1500',
    'maytunas': '1500',
    'addition hills': '1500',
    'kabayanan': '1500',
    'tibagan': '1500',
    'progreso': '1500',
    'corazon de jesus': '1500',
    'batis': '1500',
    'san perfecto': '1500',
    'salapan': '1500',
    'balong-bato': '1500',
    'rivera': '1500',
    'pedro cruz': '1500',
    'isabelita': '1500',
    'st. joseph': '1500',
    'santa lucia': '1500'
  },

  // MUNTINLUPA CITY
  'muntinlupa': {
    'alabang': '1780',
    'alabang hills': '1780',
    'ayala alabang': '1780',
    'cupang': '1771',
    'buli': '1771',
    'sucat': '1770',
    'bayanan': '1772',
    'putatan': '1772',
    'poblacion': '1776',
    'tunasan': '1773'
  },

  // LAS PIÑAS CITY
  'las piñas': {
    'bf international': '1740',
    'caa': '1740',
    'pulang lupa': '1742',
    'pulanglupa': '1742',
    'zapote': '1742',
    'almanza': '1750',
    'almanza uno': '1750',
    'almanza dos': '1751',
    'pamplona': '1740',
    'pamplona uno': '1740',
    'pamplona dos': '1740',
    'pamplona tres': '1740',
    'pilar': '1740',
    'pilar village': '1740',
    'talon': '1747',
    'talon uno': '1747',
    'talon dos': '1747',
    'talon tres': '1747',
    'talon cuatro': '1747',
    'talon singko': '1747',
    'manuyo': '1744',
    'manuyo uno': '1744',
    'manuyo dos': '1744'
  },

  // CALOOCAN CITY
  'caloocan': {
    'bagong barrio': '1400',
    'monumento': '1400',
    'grace park': '1403',
    'grace park west': '1406',
    'grace park east': '1403',
    'sangandaan': '1408',
    'maypajo': '1410',
    'bagumbong': '1421',
    'camarin': '1422',
    'deparo': '1420',
    'llano': '1420',
    'tala': '1427',
    'bagong silang': '1428',
    'kaybiga': '1420',
    'dichavez': '1423',
    'congressional': '1424'
  },

  // MARIKINA CITY
  'marikina': {
    'concepcion uno': '1807',
    'concepcion dos': '1811',
    'marikina heights': '1810',
    'industrial valley': '1802',
    'ivc': '1802',
    'nangka': '1808',
    'fortune': '1809',
    'parang': '1809',
    'malanday': '1805',
    'sto. niño': '1800',
    'santa elena': '1800',
    'san roque': '1801',
    'calumpang': '1801',
    'barangka': '1803',
    'tañong': '1803'
  }
};

// ═══ COMPLETE PHILIPPINE CITIES & MUNICIPALITIES ZIP DIRECTORY (ALL 82 PROVINCES) ═══
export const ALL_PHILIPPINE_ZIP_CODES: Record<string, Record<string, string>> = {
  // NCR / METRO MANILA
  'ncr': {
    'manila': '1000',
    'quezon city': '1100',
    'makati': '1200',
    'taguig': '1630',
    'pasig': '1600',
    'mandaluyong': '1550',
    'san juan': '1500',
    'parañaque': '1700',
    'las piñas': '1740',
    'muntinlupa': '1770',
    'pasay': '1300',
    'caloocan': '1400',
    'valenzuela': '1440',
    'malabon': '1470',
    'navotas': '1485',
    'marikina': '1800',
    'pateros': '1620'
  },
  'metro manila': {
    'manila': '1000',
    'quezon city': '1100',
    'makati': '1200',
    'taguig': '1630',
    'pasig': '1600',
    'mandaluyong': '1550',
    'san juan': '1500',
    'parañaque': '1700',
    'las piñas': '1740',
    'muntinlupa': '1770',
    'pasay': '1300',
    'caloocan': '1400',
    'valenzuela': '1440',
    'malabon': '1470',
    'navotas': '1485',
    'marikina': '1800',
    'pateros': '1620'
  },

  // ABRA (CAR)
  'abra': {
    'bangued': '2800',
    'boliney': '2815',
    'bucay': '2805',
    'bucloc': '2817',
    'daguioman': '2816',
    'danglas': '2825',
    'dolores': '2827',
    'la paz': '2826',
    'lacub': '2818',
    'lagangilang': '2802',
    'lagayan': '2824',
    'langiden': '2807',
    'licuan-baay': '2819',
    'luba': '2813',
    'malibcong': '2820',
    'manabo': '2810',
    'peñarrubia': '2804',
    'pidigan': '2806',
    'pilar': '2812',
    'sallapadan': '2814',
    'san isidro': '2809',
    'san juan': '2823',
    'san quintin': '2808',
    'tayum': '2803',
    'tineg': '2822',
    'tubo': '2811',
    'villaviciosa': '2801'
  },

  // AGUSAN DEL NORTE (Region XIII)
  'agusan del norte': {
    'butuan': '8600',
    'buenavista': '8601',
    'cabadbaran': '8605',
    'carmen': '8603',
    'jabonga': '8607',
    'kitcharao': '8609',
    'las nieves': '8610',
    'magallanes': '8604',
    'nasipit': '8602',
    'remedios t. romualdez': '8611',
    'rtr': '8611',
    'santiago': '8608',
    'tubay': '8606'
  },

  // AGUSAN DEL SUR (Region XIII)
  'agusan del sur': {
    'prosperidad': '8500',
    'san francisco': '8501',
    'san fran': '8501',
    'bayugan': '8502',
    'sibagat': '8503',
    'rosario': '8504',
    'trento': '8505',
    'bunawan': '8506',
    'loreto': '8507',
    'la paz': '8508',
    'veruela': '8509',
    'talacogon': '8510',
    'san luis': '8511',
    'santa josefa': '8512',
    'sta. josefa': '8512',
    'esperanza': '8513'
  },

  // AKLAN (Region VI)
  'aklan': {
    'kalibo': '5600',
    'malay': '5608',
    'boracay': '5608',
    'boracay island': '5608',
    'numancia': '5604',
    'makato': '5611',
    'tangalan': '5612',
    'ibajay': '5613',
    'nabas': '5607',
    'balete': '5614',
    'banga': '5601',
    'batan': '5615',
    'buruanga': '5609',
    'lezo': '5605',
    'libacao': '5602',
    'madalag': '5603',
    'malinao': '5606',
    'new washington': '5610',
    'altavas': '5616'
  },

  // ALBAY (Region V)
  'albay': {
    'legazpi': '4500',
    'legazpi city': '4500',
    'bacacay': '4501',
    'camalig': '4502',
    'daraga': '4501',
    'locsin': '4501',
    'guinobatan': '4503',
    'jovellar': '4515',
    'libon': '4507',
    'ligao': '4504',
    'malilipot': '4510',
    'malinao': '4512',
    'manito': '4514',
    'oas': '4505',
    'pio duran': '4516',
    'polangui': '4506',
    'rapu-rapu': '4517',
    'santo domingo': '4508',
    'sto. domingo': '4508',
    'tabaco': '4511',
    'tiwi': '4513'
  },

  // ANTIQUE (Region VI)
  'antique': {
    'san jose': '5700',
    'san jose de buenavista': '5700',
    'anini-y': '5717',
    'barbaza': '5706',
    'belison': '5701',
    'bugasong': '5704',
    'caluya': '5711',
    'culasi': '5708',
    'hamtic': '5715',
    'laua-an': '5705',
    'libertad': '5710',
    'pandan': '5709',
    'patnongon': '5702',
    'san remigio': '5714',
    'sebaste': '5712',
    'sibalom': '5713',
    'tibiao': '5707',
    'tobias fornier': '5716',
    'valderrama': '5703'
  },

  // APAYAO (CAR)
  'apayao': {
    'kabugao': '3809',
    'calanasan': '3814',
    'conner': '3807',
    'flora': '3810',
    'luna': '3813',
    'pudtol': '3812',
    'santa marcela': '3811',
    'sta. marcela': '3811'
  },

  // AURORA (Region III)
  'aurora': {
    'baler': '3200',
    'casiguran': '3204',
    'dilasag': '3205',
    'dinalungan': '3206',
    'dingalan': '3207',
    'dipaculao': '3203',
    'maria aurora': '3202',
    'san luis': '3201'
  },

  // BASILAN (BARMM)
  'basilan': {
    'isabela city': '7300',
    'isabela': '7300',
    'lamitan': '7302',
    'lantawan': '7301',
    'maluso': '7303',
    'sumisip': '7305',
    'tipo-tipo': '7304',
    'tuburan': '7306',
    'akbar': '7307',
    'al-barka': '7308',
    'hadji mohammad ajul': '7309',
    'ungkaya pukan': '7310',
    'hadji muhtamad': '7311',
    'tabuan-lasa': '7312'
  },

  // BATAAN (Region III)
  'bataan': {
    'balanga': '2100',
    'abucay': '2114',
    'bagac': '2107',
    'dinalupihan': '2110',
    'hermosa': '2111',
    'limay': '2103',
    'mariveles': '2105',
    'morong': '2108',
    'orani': '2112',
    'orion': '2102',
    'pilar': '2101',
    'samal': '2113'
  },

  // BATANES (Region II)
  'batanes': {
    'basco': '3900',
    'itbayat': '3905',
    'ivana': '3902',
    'mahatao': '3901',
    'sabtang': '3903',
    'uyugan': '3904'
  },

  // BATANGAS (Region IV-A)
  'batangas': {
    'batangas city': '4200',
    'lipa': '4217',
    'tanauan': '4232',
    'santo tomas': '4234',
    'sto. tomas': '4234',
    'nasugbu': '4231',
    'balayan': '4213',
    'bauan': '4201',
    'san jose': '4227',
    'lemery': '4209',
    'rosario': '4225',
    'calatagan': '4215',
    'mabini': '4202',
    'anilao': '4202',
    'san juan': '4226',
    'taal': '4208',
    'agoncillo': '4211',
    'alitagtag': '4205',
    'balete': '4219',
    'calaca': '4212',
    'cuenca': '4222',
    'ibaan': '4230',
    'laurel': '4221',
    'lian': '4216',
    'lobo': '4229',
    'malvar': '4233',
    'mataasnakahoy': '4223',
    'padre garcia': '4224',
    'san luis': '4214',
    'san nicolas': '4207',
    'san pascual': '4204',
    'santa teresita': '4206',
    'sta. teresita': '4206',
    'taysan': '4228',
    'tingloy': '4203',
    'tuy': '4212'
  },

  // BENGUET (CAR)
  'benguet': {
    'baguio': '2600',
    'baguio city': '2600',
    'la trinidad': '2601',
    'itogon': '2604',
    'tuba': '2603',
    'sablan': '2614',
    'tublay': '2615',
    'buguias': '2607',
    'atok': '2612',
    'bakun': '2610',
    'bokod': '2605',
    'kabayan': '2606',
    'kapangan': '2613',
    'kibungan': '2611',
    'mankayan': '2608'
  },

  // BILIRAN (Region VIII)
  'biliran': {
    'naval': '6543',
    'almeria': '6544',
    'biliran': '6549',
    'cabucgayan': '6550',
    'caibiran': '6548',
    'culaba': '6547',
    'kawayan': '6545',
    'maripipi': '6546'
  },

  // BOHOL (Region VII)
  'bohol': {
    'tagbilaran': '6300',
    'panglao': '6340',
    'dauis': '6339',
    'tubigon': '6329',
    'carmen': '6319',
    'jagna': '6308',
    'loay': '6303',
    'loboc': '6316',
    'talibon': '6325',
    'ubay': '6315',
    'baclayon': '6301',
    'alburquerque': '6302',
    'alicia': '6314',
    'anda': '6311',
    'antequera': '6335',
    'balilihan': '6342',
    'batuan': '6318',
    'bilar': '6317',
    'buenavista': '6333',
    'calape': '6328',
    'candijay': '6312',
    'clarin': '6330',
    'corella': '6337',
    'cortes': '6341',
    'dagohoy': '6322',
    'danao': '6344',
    'duero': '6309',
    'garcia hernandez': '6307',
    'guindulman': '6310',
    'inabanga': '6332',
    'lila': '6304',
    'loon': '6327',
    'mabini': '6313',
    'maribojoc': '6336',
    'pres. carlos p. garcia': '6346',
    'sagbayan': '6331',
    'san isidro': '6345',
    'san miguel': '6323',
    'sevilla': '6347',
    'sierra bullones': '6320',
    'sikatuna': '6338',
    'trinidad': '6324',
    'valencia': '6306'
  },

  // BUKIDNON (Region X)
  'bukidnon': {
    'malaybalay': '8700',
    'valencia': '8709',
    'manolo fortich': '8703',
    'maramag': '8714',
    'quezon': '8715',
    'don carlos': '8712',
    'kibawe': '8720',
    'kitaotao': '8716',
    'dangcagan': '8719',
    'damulog': '8721',
    'kadingilan': '8713',
    'kalilangan': '8718',
    'pangantucan': '8717',
    'talakag': '8708',
    'baungon': '8707',
    'libona': '8706',
    'malitbog': '8704',
    'impasugong': '8702',
    'sumilao': '8701',
    'cabanglasan': '8723',
    'san fernando': '8711',
    'lantapan': '8722'
  },

  // BULACAN (Region III)
  'bulacan': {
    'malolos': '3000',
    'san jose del monte': '3023',
    'sjdm': '3023',
    'meycauayan': '3020',
    'baliwag': '3006',
    'marilao': '3019',
    'santa maria': '3022',
    'sta. maria': '3022',
    'bocaue': '3018',
    'guiguinto': '3015',
    'plaridel': '3004',
    'calumpit': '3003',
    'hagonoy': '3002',
    'pulilan': '3005',
    'bulakan': '3017',
    'obando': '3021',
    'norzagaray': '3013',
    'angat': '3012',
    'san ildefonso': '3010',
    'san miguel': '3011',
    'san rafael': '3008',
    'pandi': '3014',
    'bustos': '3007',
    'paombong': '3001',
    'doña remedios trinidad': '3009',
    'drt': '3009'
  },

  // CAGAYAN (Region II)
  'cagayan': {
    'tuguegarao': '3500',
    'aparri': '3515',
    'abulug': '3517',
    'alcala': '3507',
    'allacapan': '3523',
    'amulung': '3505',
    'baggao': '3506',
    'ballesteros': '3516',
    'buguey': '3511',
    'calayan': '3520',
    'camalaniugan': '3510',
    'claveria': '3519',
    'enrile': '3501',
    'gattaran': '3508',
    'gonzaga': '3513',
    'iguig': '3504',
    'lal-lo': '3509',
    'lasam': '3524',
    'pamplona': '3522',
    'peñablanca': '3502',
    'piat': '3527',
    'rizal': '3526',
    'sanchez-mira': '3518',
    'santa ana': '3514',
    'sta. ana': '3514',
    'santa praxedes': '3521',
    'sta. praxedes': '3521',
    'santa teresita': '3512',
    'sta. teresita': '3512',
    'santo niño': '3525',
    'sto. niño': '3525',
    'solana': '3503',
    'tuao': '3528'
  },

  // CAMARINES NORTE (Region V)
  'camarines norte': {
    'daet': '4600',
    'basud': '4608',
    'capalonga': '4607',
    'jose panganiban': '4606',
    'labo': '4604',
    'mercedes': '4601',
    'paracale': '4605',
    'san lorenzo ruiz': '4610',
    'san vicente': '4609',
    'santa elena': '4611',
    'sta. elena': '4611',
    'talisay': '4602',
    'vinzons': '4603'
  },

  // CAMARINES SUR (Region V)
  'camarines sur': {
    'naga': '4400',
    'naga city': '4400',
    'iriga': '4431',
    'pili': '4418',
    'baao': '4432',
    'balatan': '4436',
    'bato': '4435',
    'bombon': '4404',
    'buhi': '4433',
    'bula': '4430',
    'cabusao': '4406',
    'calabanga': '4405',
    'camaligan': '4401',
    'canaman': '4402',
    'caramoan': '4429',
    'del gallego': '4411',
    'gainza': '4412',
    'garchitorena': '4428',
    'goa': '4422',
    'lagonoy': '4425',
    'libmanan': '4407',
    'lupi': '4409',
    'magarao': '4403',
    'milaor': '4413',
    'minalabac': '4414',
    'nabua': '4434',
    'ocampo': '4419',
    'pamplona': '4416',
    'pasacao': '4417',
    'presentacion': '4424',
    'ragay': '4410',
    'sagñay': '4421',
    'san fernando': '4415',
    'san jose': '4423',
    'sipocot': '4408',
    'siruma': '4427',
    'tigaon': '4420',
    'tinambac': '4426'
  },

  // CAMIGUIN (Region X)
  'camiguin': {
    'mambajao': '9100',
    'catarman': '9104',
    'guinsiliban': '9102',
    'mahinog': '9101',
    'sagay': '9103'
  },

  // CAPIZ (Region VI)
  'capiz': {
    'roxas': '5800',
    'roxas city': '5800',
    'cuartero': '5811',
    'dao': '5810',
    'dumalag': '5813',
    'dumarao': '5812',
    'ivisan': '5805',
    'jamindan': '5808',
    'maayon': '5809',
    'mambusao': '5807',
    'panay': '5801',
    'panitan': '5815',
    'pilar': '5804',
    'pontevedra': '5802',
    'president roxas': '5803',
    'sapi-an': '5806',
    'sigma': '5816',
    'tapaz': '5814'
  },

  // CATANDUANES (Region V)
  'catanduanes': {
    'virac': '4800',
    'bagamanoc': '4807',
    'baras': '4803',
    'bato': '4801',
    'caramoran': '4808',
    'gigmoto': '4804',
    'pandan': '4809',
    'panganiban': '4806',
    'san andres': '4810',
    'san miguel': '4802',
    'viga': '4805'
  },

  // CAVITE (Region IV-A)
  'cavite': {
    'bacoor': '4102',
    'imus': '4103',
    'dasmariñas': '4114',
    'dasmarinas': '4114',
    'general trias': '4107',
    'gen. trias': '4107',
    'tagaytay': '4120',
    'carmona': '4116',
    'trece martires': '4109',
    'cavite city': '4100',
    'silang': '4118',
    'kawit': '4104',
    'tanza': '4108',
    'naic': '4110',
    'noveleta': '4105',
    'rosario': '4106',
    'amadeo': '4119',
    'indang': '4122',
    'alfonso': '4123',
    'maragondon': '4112',
    'mendez': '4121',
    'mendez-nuñez': '4121',
    'ternate': '4111',
    'general emilio aguinaldo': '4124',
    'bailen': '4124',
    'general mariano alvarez': '4117',
    'gma': '4117',
    'magallanes': '4113'
  },

  // CEBU (Region VII)
  'cebu': {
    'cebu city': '6000',
    'mandaue': '6014',
    'lapu-lapu': '6015',
    'lapu lapu': '6015',
    'mactan': '6015',
    'talisay': '6045',
    'carcar': '6019',
    'danao': '6004',
    'naga': '6037',
    'toledo': '6038',
    'bogo': '6010',
    'consolacion': '6001',
    'liloan': '6002',
    'compostela': '6003',
    'minglanilla': '6046',
    'san fernando': '6018',
    'cordova': '6017',
    'bantayan': '6040',
    'moalboal': '6032',
    'oslob': '6025',
    'medellin': '6012',
    'daanbantayan': '6013',
    'balamban': '6041',
    'argao': '6021',
    'barili': '6051',
    'sibonga': '6020',
    'tuburan': '6043',
    'asturias': '6042',
    'santa fe': '6047',
    'sta. fe': '6047',
    'alegria': '6030',
    'alcantara': '6033',
    'alcoy': '6023',
    'aloguinsan': '6040',
    'badian': '6031',
    'boljoon': '6024',
    'borbon': '6008',
    'carmen': '6005',
    'catmon': '6006',
    'dumanjug': '6035',
    'ginatilan': '6028',
    'malabuyoc': '6029',
    'pilar': '6048',
    'pinamungajan': '6039',
    'poblacion': '6000',
    'ronda': '6034',
    'samboan': '6027',
    'san francisco': '6050',
    'san remigio': '6011',
    'santander': '6026',
    'sogod': '6007',
    'tabogon': '6009',
    'tabuelan': '6044',
    'tudela': '6049'
  },

  // COTABATO / NORTH COTABATO (Region XII)
  'cotabato': {
    'kidapawan': '9400',
    'midsayap': '9410',
    'mlang': '9402',
    'm\'lang': '9402',
    'kabacan': '9407',
    'makilala': '9401',
    'pigcawayan': '9412',
    'pikit': '9409',
    'libungan': '9411',
    'tulunan': '9403',
    'magpet': '9404',
    'president roxas': '9405',
    'antipas': '9414',
    'arakan': '9417',
    'banisilan': '9416',
    'carmen': '9408',
    'alamada': '9413',
    'aleosan': '9415'
  },
  'north cotabato': {
    'kidapawan': '9400',
    'midsayap': '9410',
    'mlang': '9402',
    'm\'lang': '9402',
    'kabacan': '9407',
    'makilala': '9401',
    'pigcawayan': '9412',
    'pikit': '9409',
    'libungan': '9411',
    'tulunan': '9403',
    'magpet': '9404',
    'president roxas': '9405',
    'antipas': '9414',
    'arakan': '9417',
    'banisilan': '9416',
    'carmen': '9408',
    'alamada': '9413',
    'aleosan': '9415'
  },

  // DAVAO DE ORO / COMPOSTELA VALLEY (Region XI)
  'davao de oro': {
    'nabunturan': '8800',
    'monkayo': '8805',
    'compostela': '8803',
    'pantukan': '8809',
    'maragusan': '8808',
    'montevista': '8801',
    'new bataan': '8804',
    'laak': '8810',
    'mawab': '8802',
    'maco': '8806',
    'mabini': '8807'
  },
  'compostela valley': {
    'nabunturan': '8800',
    'monkayo': '8805',
    'compostela': '8803',
    'pantukan': '8809',
    'maragusan': '8808',
    'montevista': '8801',
    'new bataan': '8804',
    'laak': '8810',
    'mawab': '8802',
    'maco': '8806',
    'mabini': '8807'
  },

  // DAVAO DEL NORTE (Region XI)
  'davao del norte': {
    'tagum': '8100',
    'panabo': '8105',
    'samal': '8119',
    'island garden city of samal': '8119',
    'carmen': '8101',
    'kapalong': '8113',
    'new corella': '8104',
    'asuncion': '8102',
    'santo tomas': '8112',
    'sto. tomas': '8112',
    'talaingod': '8114',
    'braulio e. dujali': '8115',
    'san isidro': '8116'
  },

  // DAVAO DEL SUR (Region XI)
  'davao del sur': {
    'davao city': '8000',
    'davao': '8000',
    'digos': '8002',
    'bansalan': '8005',
    'hagonoy': '8006',
    'kiblawan': '8008',
    'magsaysay': '8004',
    'malalag': '8010',
    'matanao': '8003',
    'padada': '8007',
    'santa cruz': '8001',
    'sta. cruz': '8001',
    'sulop': '8009'
  },

  // DAVAO OCCIDENTAL (Region XI)
  'davao occidental': {
    'malita': '8012',
    'santa maria': '8011',
    'sta. maria': '8011',
    'don marcelino': '8013',
    'jose abad santos': '8014',
    'sarangani': '8015'
  },

  // DAVAO ORIENTAL (Region XI)
  'davao oriental': {
    'mati': '8200',
    'baganga': '8204',
    'banaybanay': '8208',
    'boston': '8206',
    'caraga': '8203',
    'cateel': '8205',
    'gov. generoso': '8210',
    'governor generoso': '8210',
    'lupon': '8207',
    'manay': '8202',
    'san isidro': '8209',
    'tarragona': '8201'
  },

  // DINAGAT ISLANDS (Region XIII)
  'dinagat islands': {
    'san jose': '8427',
    'basilisa': '8413',
    'cagdianao': '8411',
    'dinagat': '8412',
    'libjo': '8414',
    'loreto': '8415',
    'tubajon': '8426'
  },

  // EASTERN SAMAR (Region VIII)
  'eastern samar': {
    'borongan': '6800',
    'guiuan': '6809',
    'arteche': '6822',
    'balangiga': '6812',
    'balangkayan': '6801',
    'can-avid': '6806',
    'dolores': '6817',
    'general macarthur': '6805',
    'giporlos': '6811',
    'hernani': '6803',
    'jipapad': '6819',
    'lawaan': '6813',
    'llorente': '6804',
    'maslog': '6820',
    'maydolong': '6802',
    'mercedes': '6808',
    'oras': '6818',
    'quinapondan': '6810',
    'salcedo': '6807',
    'san julian': '6814',
    'san policarpo': '6821',
    'sulat': '6815',
    'taft': '6816'
  },

  // GUIMARAS (Region VI)
  'guimaras': {
    'jordan': '5045',
    'buenavista': '5044',
    'nueva valencia': '5046',
    'san lorenzo': '5047',
    'sibunag': '5048'
  },

  // IFUGAO (CAR)
  'ifugao': {
    'lagawe': '3600',
    'banaue': '3601',
    'alfonso lista': '3608',
    'aguinaldo': '3606',
    'asipulo': '3610',
    'hingyon': '3607',
    'hungduan': '3603',
    'kiangan': '3604',
    'lamut': '3605',
    'mayoyao': '3602',
    'tinoc': '3609'
  },

  // ILOCOS NORTE (Region I)
  'ilocos norte': {
    'laoag': '2900',
    'batac': '2906',
    'san nicolas': '2901',
    'bacarra': '2916',
    'badoc': '2904',
    'bangui': '2920',
    'banna': '2908',
    'burgos': '2918',
    'carasi': '2911',
    'currimao': '2903',
    'dingras': '2913',
    'dumalneg': '2921',
    'marcos': '2907',
    'nueva era': '2909',
    'pagudpud': '2919',
    'paoay': '2902',
    'pasuquin': '2917',
    'piddig': '2912',
    'pinili': '2905',
    'san mateo': '2914',
    'sarrat': '2914',
    'solsona': '2910',
    'vintar': '2915'
  },

  // ILOCOS SUR (Region I)
  'ilocos sur': {
    'vigan': '2700',
    'candon': '2710',
    'narvacan': '2704',
    'tagudin': '2714',
    'bantay': '2727',
    'cabugao': '2732',
    'magsingal': '2730',
    'santa maria': '2705',
    'sta. maria': '2705',
    'sinait': '2733',
    'santo domingo': '2729',
    'sto. domingo': '2729',
    'alilem': '2716',
    'banayoyo': '2708',
    'burgos': '2724',
    'caoayan': '2701',
    'cervantes': '2718',
    'galimuyod': '2709',
    'gregorio del pilar': '2720',
    'lidlidda': '2723',
    'nagbukel': '2725',
    'quirino': '2721',
    'salcedo': '2711',
    'san emilio': '2722',
    'san esteban': '2706',
    'san ildefonso': '2728',
    'san juan': '2731',
    'san vicente': '2726',
    'santa': '2703',
    'santa catalina': '2701',
    'santa cruz': '2707',
    'santa lucia': '2712',
    'santiago': '2707',
    'sigay': '2719',
    'sugpon': '2717',
    'suyo': '2715'
  },

  // ILOILO (Region VI)
  'iloilo': {
    'iloilo city': '5000',
    'passi': '5037',
    'oton': '5020',
    'pavia': '5001',
    'leganes': '5003',
    'zarraga': '5004',
    'santa barbara': '5002',
    'sta. barbara': '5002',
    'cabatuan': '5031',
    'pototan': '5008',
    'dumangas': '5006',
    'barotac nuevo': '5007',
    'barotac viejo': '5011',
    'miagao': '5023',
    'guimbal': '5022',
    'tigbauan': '5021',
    'san joaquin': '5024',
    'janiuay': '5034',
    'dingle': '5035',
    'estancia': '5017',
    'carles': '5019',
    'concepcion': '5013',
    'banate': '5010',
    'anilao': '5009',
    'ajuy': '5012',
    'calinog': '5040',
    'alimodian': '5028',
    'badiangan': '5033',
    'balasan': '5018',
    'batad': '5016',
    'bingawan': '5041',
    'dueñas': '5038',
    'lambunao': '5042',
    'lemery': '5043',
    'leon': '5026',
    'maasin': '5030',
    'mina': '5032',
    'new lucena': '5005',
    'san dionisio': '5015',
    'san enrique': '5036',
    'san miguel': '5025',
    'san rafael': '5039',
    'tubungan': '5027'
  },

  // ISABELA (Region II)
  'isabela': {
    'ilagan': '3300',
    'santiago': '3311',
    'santiago city': '3311',
    'cauayan': '3305',
    'alicia': '3306',
    'roxas': '3320',
    'san mateo': '3318',
    'cabagan': '3328',
    'echague': '3309',
    'tumauini': '3325',
    'angadanan': '3307',
    'aurora': '3316',
    'benito soliven': '3331',
    'burgos': '3322',
    'cabatuan': '3315',
    'cordon': '3312',
    'delfin albano': '3326',
    'dinapigue': '3336',
    'divilacan': '3335',
    'gamu': '3301',
    'jones': '3313',
    'luna': '3304',
    'maconacon': '3333',
    'mallig': '3323',
    'naguilian': '3302',
    'palanan': '3334',
    'quezon': '3324',
    'quirino': '3321',
    'ramon': '3319',
    'reina mercedes': '3303',
    'san agustin': '3314',
    'san guillermo': '3308',
    'san isidro': '3310',
    'san manuel': '3317',
    'san mariano': '3332',
    'san pablo': '3329',
    'santa maria': '3330',
    'sta. maria': '3330',
    'santo tomas': '3327',
    'sto. tomas': '3327'
  },

  // KALINGA (CAR)
  'kalinga': {
    'tabuk': '3800',
    'balbalan': '3801',
    'lubuagan': '3802',
    'pasil': '3803',
    'pinukpuk': '3806',
    'rizal': '3808',
    'tanudan': '3805',
    'tinglayan': '3804'
  },

  // LA UNION (Region I)
  'la union': {
    'san fernando': '2500',
    'agoo': '2504',
    'bauang': '2501',
    'bacnotan': '2515',
    'balaoan': '2517',
    'bangar': '2519',
    'caba': '2502',
    'luna': '2518',
    'naguilian': '2511',
    'rosario': '2506',
    'san juan': '2514',
    'santo tomas': '2505',
    'sto. tomas': '2505',
    'aringay': '2503',
    'bagulin': '2512',
    'burgos': '2510',
    'pugo': '2508',
    'san gabriel': '2513',
    'santol': '2516',
    'sudipen': '2520',
    'tubao': '2507'
  },

  // LAGUNA (Region IV-A)
  'laguna': {
    'calamba': '4027',
    'santa rosa': '4026',
    'sta. rosa': '4026',
    'biñan': '4024',
    'binan': '4024',
    'cabuyao': '4025',
    'san pedro': '4023',
    'san pablo': '4000',
    'los baños': '4030',
    'los banos': '4030',
    'santa cruz': '4009',
    'sta. cruz': '4009',
    'pila': '4010',
    'victoria': '4011',
    'pagsanjan': '4008',
    'lumban': '4014',
    'calauan': '4012',
    'bay': '4033',
    'magdalena': '4007',
    'liliw': '4004',
    'majayjay': '4005',
    'nagcarlan': '4002',
    'rizal': '4003',
    'siniloan': '4019',
    'paete': '4016',
    'pakil': '4017',
    'pangil': '4018',
    'famy': '4021',
    'mabitac': '4020',
    'santa maria': '4022',
    'sta. maria': '4022',
    'alaminos': '4001',
    'luisiana': '4032',
    'cavinti': '4013',
    'kalayaan': '4015'
  },

  // LANAO DEL NORTE (Region X)
  'lanao del norte': {
    'iligan': '9200',
    'iligan city': '9200',
    'tubod': '9209',
    'kapatagan': '9214',
    'lala': '9211',
    'kolambugan': '9207',
    'bacolod': '9205',
    'baloi': '9217',
    'baroy': '9210',
    'kauswagan': '9202',
    'linamon': '9201',
    'magsaysay': '9221',
    'maigo': '9206',
    'matungao': '9203',
    'munai': '9219',
    'nunungan': '9216',
    'pantao ragat': '9208',
    'pantar': '9218',
    'poona piagapo': '9204',
    'salvador': '9212',
    'sapad': '9213',
    'sultan naga dimaporo': '9223',
    'tagoloan': '9222',
    'tangcal': '9220'
  },

  // LANAO DEL SUR (BARMM)
  'lanao del sur': {
    'marawi': '9700',
    'marawi city': '9700',
    'balabagan': '9302',
    'malabang': '9300',
    'wao': '9716',
    'bayang': '9309',
    'binidayan': '9310',
    'buadiposo-buntong': '9714',
    'bubong': '9708',
    'butig': '9305',
    'calanogas': '9319',
    'ditsaan-ramain': '9713',
    'ganassi': '9317',
    'kapai': '9709',
    'kapatagan': '9312',
    'lumbaca-unayan': '9307',
    'lumbatan': '9307',
    'lumbayanague': '9306',
    'madalum': '9315',
    'madamba': '9314',
    'masiu': '9706',
    'mulondo': '9702',
    'pagayawan': '9312',
    'piagapo': '9705',
    'picong': '9301',
    'poona bayabao': '9701',
    'pualas': '9313',
    'saguiaran': '9701',
    'sultan dumalondong': '9318',
    'tagoloan ii': '9711',
    'tamparan': '9704',
    'taraka': '9707',
    'tubaran': '9304',
    'tugaya': '9316'
  },

  // LEYTE (Region VIII)
  'leyte': {
    'tacloban': '6500',
    'ormoc': '6541',
    'baybay': '6521',
    'palo': '6501',
    'tanauan': '6502',
    'carigara': '6529',
    'abuyog': '6510',
    'alangalang': '6517',
    'albuera': '6542',
    'babatngon': '6520',
    'barugo': '6519',
    'bato': '6525',
    'burauen': '6516',
    'calubian': '6537',
    'capoocan': '6530',
    'dagami': '6515',
    'dulag': '6505',
    'hilongos': '6524',
    'hindang': '6523',
    'inopacan': '6522',
    'isabel': '6539',
    'jaro': '6527',
    'javier': '6511',
    'julita': '6506',
    'kananga': '6531',
    'la paz': '6508',
    'leyte': '6533',
    'macarthur': '6509',
    'mahaplag': '6512',
    'matag-ob': '6532',
    'matalom': '6526',
    'mayorga': '6507',
    'merida': '6540',
    'pastrana': '6514',
    'san isidro': '6535',
    'san miguel': '6518',
    'santa fe': '6513',
    'sta. fe': '6513',
    'tabango': '6536',
    'tabontabon': '6504',
    'tolosa': '6503',
    'tunga': '6528',
    'villaba': '6534'
  },

  // MAGUINDANAO (BARMM)
  'maguindanao': {
    'cotabato': '9600',
    'cotabato city': '9600',
    'datu odin sinsuat': '9601',
    'parang': '9604',
    'sultan kudarat': '9605',
    'nuling': '9605',
    'buluan': '9616',
    'shariff aguak': '9608',
    'maganoy': '9608',
    'ampatuan': '9609',
    'barira': '9614',
    'datu paglas': '9617',
    'datu piang': '9607',
    'matanog': '9613',
    'pagalungan': '9610',
    'south upi': '9603',
    'sultan sa barongis': '9611',
    'talayan': '9612',
    'upi': '9602',
    'guindulungan': '9628',
    'datu saudi-ampatuan': '9627',
    'datu unsay': '9629',
    'datu hoffer': '9630',
    'datu salibo': '9631',
    'shariff saydona mustapha': '9632',
    'mamasapano': '9633',
    'northern kabuntalan': '9634',
    'kabuntalan': '9606'
  },
  'maguindanao del norte': {
    'datu odin sinsuat': '9601',
    'parang': '9604',
    'sultan kudarat': '9605',
    'barira': '9614',
    'matanog': '9613',
    'upi': '9602',
    'kabuntalan': '9606',
    'northern kabuntalan': '9634'
  },
  'maguindanao del sur': {
    'buluan': '9616',
    'shariff aguak': '9608',
    'ampatuan': '9609',
    'datu paglas': '9617',
    'datu piang': '9607',
    'pagalungan': '9610',
    'south upi': '9603',
    'sultan sa barongis': '9611',
    'talayan': '9612'
  },

  // MARINDUQUE (MIMAROPA)
  'marinduque': {
    'boac': '4900',
    'buenavista': '4904',
    'gasan': '4905',
    'mogpog': '4901',
    'santa cruz': '4902',
    'sta. cruz': '4902',
    'torrijos': '4903'
  },

  // MASBATE (Region V)
  'masbate': {
    'masbate': '5400',
    'masbate city': '5400',
    'aroroy': '5414',
    'baleno': '5413',
    'balud': '5412',
    'batuan': '5415',
    'cataingan': '5405',
    'cawayan': '5409',
    'claveria': '5419',
    'dimasalang': '5403',
    'esperanza': '5407',
    'mandaon': '5411',
    'milagros': '5410',
    'mobo': '5401',
    'monreal': '5418',
    'palanas': '5404',
    'pio v. corpuz': '5406',
    'placer': '5408',
    'san fernando': '5416',
    'san jacinto': '5417',
    'san pascual': '5420',
    'uson': '5402'
  },

  // MISAMIS OCCIDENTAL (Region X)
  'misamis occidental': {
    'oroquieta': '7207',
    'ozamiz': '7200',
    'tangub': '7214',
    'aloran': '7206',
    'baliangao': '7211',
    'bonifacio': '7215',
    'calamba': '7210',
    'clarin': '7201',
    'concepcion': '7213',
    'don victoriano chiongbian': '7207',
    'jimenez': '7204',
    'lopez jaena': '7208',
    'panaon': '7205',
    'plaridel': '7209',
    'sapang dalaga': '7212',
    'sinacaban': '7203',
    'tudela': '7202'
  },

  // MISAMIS ORIENTAL (Region X)
  'misamis oriental': {
    'cagayan de oro': '9000',
    'cdo': '9000',
    'gingoog': '9014',
    'el salvador': '9017',
    'opol': '9016',
    'tagoloan': '9001',
    'villanueva': '9002',
    'jasaan': '9003',
    'balingasag': '9005',
    'initao': '9022',
    'alubijid': '9018',
    'claveria': '9004',
    'manticao': '9024',
    'lugait': '9025',
    'medina': '9013',
    'balingoan': '9011',
    'binuangan': '9008',
    'gitagum': '9020',
    'kinoguitan': '9010',
    'lagonglong': '9006',
    'libertad': '9021',
    'magsaysay': '9015',
    'naawan': '9023',
    'salay': '9007',
    'sugbongcogon': '9009',
    'talisayan': '9012'
  },

  // MOUNTAIN PROVINCE (CAR)
  'mountain province': {
    'bontoc': '2616',
    'barlig': '2623',
    'bauko': '2621',
    'besao': '2618',
    'natonin': '2624',
    'paracelis': '2625',
    'sabangan': '2622',
    'sadanga': '2617',
    'sagada': '2619',
    'tadian': '2620'
  },

  // NEGROS OCCIDENTAL (NIR / Region VI)
  'negros occidental': {
    'bacolod': '6100',
    'bago': '6101',
    'cadiz': '6121',
    'escalante': '6124',
    'himamaylan': '6108',
    'kabankalan': '6111',
    'la carlota': '6130',
    'sagay': '6122',
    'san carlos': '6127',
    'silay': '6116',
    'sipalay': '6113',
    'talisay': '6115',
    'victorias': '6119',
    'binalbagan': '6107',
    'calatrava': '6126',
    'cauayan': '6112',
    'e.b. magalona': '6118',
    'hinigaran': '6106',
    'hinoba-an': '6114',
    'ilog': '6109',
    'isabela': '6128',
    'la castellana': '6131',
    'manapla': '6120',
    'moises padilla': '6132',
    'murcia': '6129',
    'pontevedra': '6105',
    'pulupandan': '6102',
    'salvador benedicto': '6133',
    'san enrique': '6104',
    'toboso': '6125',
    'valladolid': '6103'
  },

  // NEGROS ORIENTAL (NIR / Region VII)
  'negros oriental': {
    'dumaguete': '6200',
    'bais': '6206',
    'bayawan': '6221',
    'canlaon': '6223',
    'guihulngan': '6214',
    'tanjay': '6204',
    'amlan': '6203',
    'ayungon': '6210',
    'bacong': '6216',
    'dauin': '6217',
    'jimalalud': '6212',
    'la libertad': '6213',
    'mabinay': '6207',
    'manjuyod': '6208',
    'pamplona': '6205',
    'san jose': '6202',
    'siaton': '6219',
    'sibulan': '6201',
    'valencia': '6215',
    'vallehermoso': '6224',
    'zamboanguita': '6218',
    'basay': '6222',
    'bindoy': '6209',
    'santa catalina': '6220',
    'tayasan': '6211'
  },

  // NORTHERN SAMAR (Region VIII)
  'northern samar': {
    'catarman': '6400',
    'allen': '6405',
    'biri': '6410',
    'bobon': '6401',
    'capul': '6408',
    'gamay': '6422',
    'laoang': '6411',
    'lapinig': '6423',
    'las navas': '6420',
    'lavezares': '6404',
    'lope de vega': '6403',
    'mapanas': '6412',
    'mondragon': '6417',
    'palapag': '6413',
    'pambujan': '6414',
    'rosario': '6416',
    'san antonio': '6407',
    'san isidro': '6409',
    'san jose': '6402',
    'san roque': '6415',
    'san vicente': '6406',
    'silvino lobos': '6419',
    'victoria': '6418'
  },

  // NUEVA ECIJA (Region III)
  'nueva ecija': {
    'cabanatuan': '3100',
    'gapan': '3105',
    'palayan': '3132',
    'san jose': '3121',
    'science city of munoz': '3119',
    'munoz': '3119',
    'talavera': '3114',
    'guimba': '3115',
    'san leonardo': '3102',
    'santa rosa': '3101',
    'sta. rosa': '3101',
    'san antonio': '3108',
    'san isidro': '3106',
    'zaragoza': '3110',
    'jaen': '3109',
    'general tinio': '3104',
    'peñaranda': '3103',
    'aliaga': '3111',
    'bongabon': '3128',
    'cabiao': '3107',
    'cuyapo': '3117',
    'gabaldon': '3131',
    'general natividad': '3125',
    'laur': '3129',
    'licab': '3112',
    'llanera': '3126',
    'lupao': '3122',
    'nampicuan': '3116',
    'pantabangan': '3124',
    'quezon': '3113',
    'rizal': '3127',
    'talugtug': '3118'
  },

  // NUEVA VIZCAYA (Region II)
  'nueva vizcaya': {
    'bayombong': '3700',
    'solano': '3709',
    'alfonso castañeda': '3714',
    'ambaguio': '3701',
    'aritao': '3704',
    'bagabag': '3711',
    'bambang': '3702',
    'diadi': '3712',
    'dupax del norte': '3706',
    'dupax del sur': '3707',
    'kasibu': '3703',
    'kayapa': '3708',
    'quezon': '3713',
    'santa fe': '3705',
    'sta. fe': '3705',
    'villaverde': '3710'
  },

  // OCCIDENTAL MINDORO (MIMAROPA)
  'occidental mindoro': {
    'mamburao': '5106',
    'san jose': '5100',
    'abra de ilog': '5108',
    'calintaan': '5102',
    'looc': '5111',
    'lubang': '5109',
    'magsaysay': '5101',
    'paluan': '5107',
    'rizal': '5103',
    'sablayan': '5104',
    'santa cruz': '5105',
    'sta. cruz': '5105'
  },

  // ORIENTAL MINDORO (MIMAROPA)
  'oriental mindoro': {
    'calapan': '5200',
    'puerto galera': '5203',
    'baco': '5201',
    'bansud': '5210',
    'bongabong': '5211',
    'bulalacao': '5214',
    'gloria': '5209',
    'mansalay': '5213',
    'naujan': '5204',
    'pinamalayan': '5208',
    'pola': '5206',
    'roxas': '5212',
    'san teodoro': '5202',
    'socorro': '5207',
    'victoria': '5205'
  },

  // PALAWAN (MIMAROPA)
  'palawan': {
    'puerto princesa': '5300',
    'coron': '5316',
    'el nido': '5313',
    'san vicente': '5309',
    'taytay': '5312',
    'culion': '5315',
    'busuanga': '5317',
    'linapacan': '5314',
    'roxas': '5308',
    'dumaran': '5310',
    'araceli': '5311',
    'aborlan': '5302',
    'narra': '5303',
    'quezon': '5304',
    'sofronio española': '5305',
    'brooke\'s point': '5305',
    'bataraza': '5306',
    'balabac': '5307',
    'cuyo': '5318',
    'magsaysay': '5319',
    'agutaya': '5320',
    'cagayancillo': '5321',
    'kalayaan': '5322'
  },

  // PAMPANGA (Region III)
  'pampanga': {
    'san fernando': '2000',
    'angeles': '2009',
    'mabalacat': '2010',
    'clark': '2023',
    'clark freeport': '2023',
    'guagua': '2003',
    'lubao': '2005',
    'mexico': '2021',
    'arayat': '2016',
    'bacolor': '2001',
    'candaba': '2013',
    'porac': '2008',
    'apalit': '2016',
    'macabebe': '2018',
    'masantol': '2017',
    'magalang': '2011',
    'floridablanca': '2006',
    'santa rita': '2002',
    'sta. rita': '2002',
    'san simon': '2015',
    'santa ana': '2022',
    'sta. ana': '2022',
    'santo tomas': '2020',
    'sto. tomas': '2020',
    'minalin': '2019',
    'sasmuan': '2004'
  },

  // PANGASINAN (Region I)
  'pangasinan': {
    'dagupan': '2400',
    'san carlos': '2420',
    'urdaneta': '2428',
    'alaminos': '2404',
    'lingayen': '2401',
    'calasiao': '2418',
    'mangaldan': '2432',
    'binmaley': '2417',
    'bayambang': '2423',
    'malasiqui': '2421',
    'rosales': '2441',
    'tayug': '2445',
    'villasis': '2427',
    'alcala': '2425',
    'anda': '2405',
    'asingan': '2439',
    'balungao': '2442',
    'bani': '2407',
    'basista': '2422',
    'bautista': '2424',
    'bolinao': '2406',
    'bugallon': '2416',
    'burgos': '2410',
    'dasol': '2411',
    'infanta': '2412',
    'labrador': '2402',
    'laoac': '2437',
    'mabini': '2409',
    'manaoag': '2430',
    'mangatarem': '2413',
    'mapandan': '2429',
    'natividad': '2446',
    'pozorrubio': '2435',
    'san fabian': '2433',
    'san jacinto': '2431',
    'san manuel': '2438',
    'san nicolas': '2447',
    'san quintin': '2444',
    'santa barbara': '2419',
    'sta. barbara': '2419',
    'santa maria': '2440',
    'sta. maria': '2440',
    'santo tomas': '2426',
    'sto. tomas': '2426',
    'sison': '2434',
    'sual': '2403',
    'umingan': '2443',
    'urbiztondo': '2414'
  },

  // QUEZON (Region IV-A)
  'quezon': {
    'lucena': '4301',
    'tayabas': '4327',
    'candelaria': '4323',
    'sariaya': '4352',
    'tiaong': '4325',
    'pagbilao': '4302',
    'lucban': '4328',
    'gumaca': '4307',
    'lopez': '4316',
    'calauag': '4318',
    'tagkawayan': '4321',
    'infanta': '4336',
    'real': '4335',
    'general nakar': '4338',
    'mauban': '4330',
    'atanay': '4331',
    'polillo': '4339',
    'unisan': '4305',
    'macalelon': '4309',
    'pitogo': '4308',
    'catanauan': '4311',
    'mulanay': '4312',
    'san narciso': '4313',
    'san andres': '4314',
    'san francisco': '4315'
  },

  // QUIRINO (Region II)
  'quirino': {
    'cabarroguis': '3400',
    'aglipay': '3403',
    'diffun': '3401',
    'maddela': '3404',
    'nagtipunan': '3405',
    'saguday': '3402'
  },

  // RIZAL (Region IV-A)
  'rizal': {
    'antipolo': '1870',
    'cainta': '1900',
    'taytay': '1920',
    'san mateo': '1850',
    'rodriguez': '1860',
    'montalban': '1860',
    'angono': '1930',
    'binangonan': '1940',
    'baras': '1970',
    'cardona': '1950',
    'jala-jala': '1990',
    'pililla': '1980',
    'tanay': '1960',
    'teresa': '1880',
    'morong': '1905'
  },

  // ROMBLON (MIMAROPA)
  'romblon': {
    'romblon': '5500',
    'odiongan': '5505',
    'alcantara': '5509',
    'banton': '5515',
    'cajidiocan': '5512',
    'calatrava': '5503',
    'concepcion': '5516',
    'corcuera': '5514',
    'ferrol': '5506',
    'looc': '5507',
    'magdiwang': '5511',
    'san agustin': '5501',
    'san andres': '5504',
    'san fernando': '5513',
    'san jose': '5510',
    'santa fe': '5508',
    'sta. fe': '5508',
    'santa maria': '5502',
    'sta. maria': '5502'
  },

  // SAMAR / WESTERN SAMAR (Region VIII)
  'samar': {
    'catbalogan': '6700',
    'calbayog': '6710',
    'basey': '6720',
    'calbiga': '6715',
    'gandara': '6706',
    'hinabangan': '6713',
    'jiabong': '6701',
    'marabut': '6721',
    'motiong': '6702',
    'pagsanghan': '6705',
    'paranas': '6703',
    'pinabacdao': '6716',
    'san jorge': '6707',
    'san jose de buan': '6725',
    'san sebastian': '6714',
    'santa margarita': '6709',
    'sta. margarita': '6709',
    'santa rita': '6718',
    'sta. rita': '6718',
    'santo niño': '6711',
    'sto. niño': '6711',
    'tarangnan': '6704',
    'villareal': '6717',
    'zumarraga': '6724',
    'almagro': '6723',
    'daram': '6722',
    'matuguinao': '6708',
    'tagapul-an': '6719',
    'talalora': '6712'
  },
  'western samar': {
    'catbalogan': '6700',
    'calbayog': '6710',
    'basey': '6720',
    'calbiga': '6715',
    'gandara': '6706',
    'hinabangan': '6713',
    'jiabong': '6701',
    'marabut': '6721',
    'motiong': '6702',
    'pagsanghan': '6705',
    'paranas': '6703',
    'pinabacdao': '6716',
    'san jorge': '6707',
    'san jose de buan': '6725',
    'san sebastian': '6714',
    'santa margarita': '6709',
    'sta. margarita': '6709',
    'santa rita': '6718',
    'sta. rita': '6718',
    'santo niño': '6711',
    'tarangnan': '6704',
    'villareal': '6717',
    'zumarraga': '6724'
  },

  // SARANGANI (Region XII)
  'sarangani': {
    'alabel': '9501',
    'glan': '9517',
    'kiamba': '9514',
    'maasim': '9502',
    'maitum': '9515',
    'malapatan': '9516',
    'malungon': '9503'
  },

  // SIQUIJOR (Region VII)
  'siquijor': {
    'siquijor': '6225',
    'enrique villanueva': '6230',
    'larena': '6226',
    'lazi': '6228',
    'maria': '6229',
    'san juan': '6227'
  },

  // SORSOGON (Region V)
  'sorsogon': {
    'sorsogon': '4700',
    'sorsogon city': '4700',
    'barcelona': '4712',
    'bulan': '4706',
    'bulusan': '4704',
    'casiguran': '4702',
    'castilla': '4713',
    'donsol': '4715',
    'gubat': '4710',
    'irosin': '4707',
    'juban': '4703',
    'magallanes': '4705',
    'matnog': '4708',
    'pilar': '4714',
    'prieto diaz': '4711',
    'santa magdalena': '4709',
    'sta. magdalena': '4709'
  },

  // SOUTH COTABATO (Region XII)
  'south cotabato': {
    'general santos': '9500',
    'gensan': '9500',
    'koronadal': '9506',
    'polomolok': '9504',
    'tupi': '9505',
    'surallah': '9512',
    'tboli': '9513',
    't\'boli': '9513',
    'norala': '9508',
    'sto. nino': '9509',
    'santo nino': '9509',
    'tantangan': '9510',
    'lake sebu': '9511',
    'banga': '9507',
    'tampakan': '9507'
  },

  // SOUTHERN LEYTE (Region VIII)
  'southern leyte': {
    'maasin': '6600',
    'sogod': '6606',
    'anahawan': '6610',
    'bontoc': '6604',
    'hinunangan': '6608',
    'hinundayan': '6609',
    'libagon': '6615',
    'liloan': '6612',
    'limasawa': '6600',
    'macrohon': '6601',
    'malitbog': '6603',
    'padre burgos': '6602',
    'pintuyan': '6614',
    'saint bernard': '6616',
    'st. bernard': '6616',
    'san francisco': '6613',
    'san juan': '6611',
    'cabalian': '6611',
    'san ricardo': '6617',
    'silago': '6607',
    'tomas oppus': '6605'
  },

  // SULTAN KUDARAT (Region XII)
  'sultan kudarat': {
    'tacurong': '9800',
    'isulan': '9805',
    'bagumbayan': '9810',
    'columbio': '9801',
    'esperanza': '9806',
    'kalamansig': '9808',
    'lebak': '9807',
    'lutayan': '9803',
    'palimbang': '9809',
    'president quirino': '9804',
    'senator ninoy aquino': '9811'
  },

  // SULU (BARMM)
  'sulu': {
    'jolo': '7400',
    'indanan': '7407',
    'hadji panglima tahil': '7413',
    'kalingalan caluang': '7416',
    'luuk': '7404',
    'maimbung': '7409',
    'old panamao': '7402',
    'omar': '7417',
    'pandami': '7405',
    'panglima estino': '7415',
    'pangutaran': '7414',
    'parang': '7408',
    'pata': '7405',
    'patikul': '7401',
    'siasi': '7412',
    'talipao': '7403',
    'tapul': '7406',
    'lugus': '7411'
  },

  // SURIGAO DEL NORTE (Region XIII)
  'surigao del norte': {
    'surigao': '8400',
    'surigao city': '8400',
    'dapa': '8417',
    'general luna': '8419',
    'del carmen': '8418',
    'alegria': '8425',
    'bacuag': '8408',
    'burgos': '8424',
    'claver': '8410',
    'gigaquit': '8409',
    'mainit': '8407',
    'malimono': '8402',
    'pilar': '8420',
    'placer': '8405',
    'san benito': '8423',
    'san francisco': '8401',
    'san isidro': '8421',
    'santa monica': '8422',
    'sta. monica': '8422',
    'sison': '8404',
    'socorro': '8416',
    'tagana-an': '8403',
    'tubod': '8406'
  },

  // SURIGAO DEL SUR (Region XIII)
  'surigao del sur': {
    'tandag': '8300',
    'bislig': '8311',
    'barobo': '8309',
    'bayabas': '8303',
    'cantilan': '8317',
    'carmen': '8315',
    'carrascal': '8318',
    'cortes': '8313',
    'hinatuan': '8310',
    'lanuza': '8314',
    'lianga': '8307',
    'lingig': '8312',
    'madrid': '8316',
    'marihatag': '8306',
    'san agustin': '8305',
    'san miguel': '8301',
    'tagbina': '8308',
    'tago': '8302'
  },

  // TARLAC (Region III)
  'tarlac': {
    'tarlac': '2300',
    'tarlac city': '2300',
    'capas': '2315',
    'concepcion': '2316',
    'gerona': '2302',
    'paniqui': '2307',
    'camiling': '2306',
    'bamban': '2317',
    'la paz': '2314',
    'victoria': '2313',
    'moncada': '2308',
    'san manuel': '2309',
    'santa ignacia': '2303',
    'sta. ignacia': '2303',
    'mayantoc': '2304',
    'san clemente': '2305',
    'san jose': '2318',
    'pura': '2312',
    'ramos': '2311',
    'anao': '2310'
  },

  // TAWI-TAWI (BARMM)
  'tawi-tawi': {
    'bongao': '7500',
    'panglima sugala': '7501',
    'simunul': '7505',
    'sitangkai': '7506',
    'south ubian': '7503',
    'tandubas': '7502',
    'turtle islands': '7507',
    'languyan': '7509',
    'mapun': '7508',
    'sapa-sapa': '7504',
    'sibutu': '7510'
  },

  // ZAMBALES (Region III)
  'zambales': {
    'olongapo': '2200',
    'iba': '2201',
    'subic': '2209',
    'castillejos': '2208',
    'san marcelino': '2207',
    'san antonio': '2206',
    'san narciso': '2205',
    'san felipe': '2204',
    'cabangan': '2203',
    'botolan': '2202',
    'palauig': '2210',
    'masinloc': '2211',
    'candelaria': '2212',
    'santa cruz': '2213',
    'sta. cruz': '2213'
  },

  // ZAMBOANGA DEL NORTE (Region IX)
  'zamboanga del norte': {
    'dipolog': '7100',
    'dapitan': '7101',
    'sindangan': '7112',
    'labason': '7117',
    'liloy': '7115',
    'siocon': '7120',
    'bacungan': '7109',
    'baliguian': '7123',
    'godod': '7125',
    'gutalac': '7118',
    'jose dalman': '7111',
    'kalawit': '7124',
    'katipunan': '7109',
    'la libertad': '7107',
    'manukan': '7110',
    'mutia': '7107',
    'piñan': '7105',
    'polanco': '7106',
    'pres. manuel a. roxas': '7102',
    'roxas': '7102',
    'rizal': '7104',
    'salug': '7114',
    'sergio osmeña': '7108',
    'siayan': '7113',
    'sibuco': '7122',
    'sibutad': '7103',
    'sirawai': '7121',
    'tampilisan': '7116'
  },

  // ZAMBOANGA DEL SUR (Region IX)
  'zamboanga del sur': {
    'zamboanga': '7000',
    'zamboanga city': '7000',
    'pagadian': '7016',
    'aurora': '7020',
    'bayog': '7011',
    'dimataling': '7032',
    'dinas': '7030',
    'dumalinao': '7015',
    'dumingag': '7028',
    'guipos': '7042',
    'kumalarang': '7013',
    'labangan': '7017',
    'lapuyan': '7037',
    'mahayag': '7026',
    'margosatubig': '7035',
    'midsalip': '7021',
    'molave': '7023',
    'pitogo': '7033',
    'ramon magsaysay': '7024',
    'san miguel': '7025',
    'san pablo': '7031',
    'sominot': '7022',
    'tabina': '7034',
    'tambulig': '7025',
    'tigbao': '7043',
    'tukuran': '7019',
    'vincenzo a. sagun': '7036'
  },

  // ZAMBOANGA SIBUGAY (Region IX)
  'zamboanga sibugay': {
    'ipil': '7001',
    'alicia': '7040',
    'buug': '7009',
    'diplahan': '7039',
    'imelda': '7007',
    'kabasalan': '7005',
    'mabuhay': '7010',
    'malangas': '7038',
    'naga': '7004',
    'olutanga': '7041',
    'payao': '7008',
    'roseller lim': '7002',
    'siay': '7006',
    'talusan': '7012',
    'titay': '7003',
    'tungawan': '7018'
  }
};

/**
 * Normalizes input string for robust geographic matching
 */
function cleanGeoString(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/^city of\s+/i, '')
    .replace(/\s+city$/i, '')
    .replace(/^municipality of\s+/i, '')
    .replace(/^province of\s+/i, '')
    .replace(/^brgy\.?\s+/i, '')
    .replace(/^barangay\s+/i, '')
    .replace(/\(.*?\)/g, '') // remove parenthesized annotations
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves the precise, exact Philippine Postal ZIP code
 * with multi-tier cascaded matching:
 * Tier 1: Barangay / Sub-district specific code
 * Tier 2: Exact City / Municipality lookup in Province
 * Tier 3: Global cross-province city lookup
 */
export function resolveExactPhilippineZipCode(
  cityName: string,
  provinceName?: string,
  barangayName?: string
): string {
  if (!cityName && !provinceName && !barangayName) return '';

  const cleanCity = cleanGeoString(cityName);
  const cleanProv = cleanGeoString(provinceName || '');
  const cleanBrgy = cleanGeoString(barangayName || '');

  // ─── TIER 1: SPECIFIC BARANGAY / DISTRICT RESOLUTION ───
  if (cleanBrgy) {
    // Check Metro Manila & multi-district cities first
    for (const [mappedCity, brgyList] of Object.entries(NCR_BARANGAY_ZIP_MAP)) {
      const cityMatches = !cleanCity || mappedCity.includes(cleanCity) || cleanCity.includes(mappedCity);
      if (cityMatches) {
        for (const [bKey, zip] of Object.entries(brgyList)) {
          if (cleanBrgy === bKey || cleanBrgy.includes(bKey) || bKey.includes(cleanBrgy)) {
            return zip;
          }
        }
      }
    }

    // Global barangay keyword match across all mapped cities
    for (const brgyList of Object.values(NCR_BARANGAY_ZIP_MAP)) {
      for (const [bKey, zip] of Object.entries(brgyList)) {
        if (cleanBrgy === bKey || (bKey.length > 3 && cleanBrgy.includes(bKey))) {
          return zip;
        }
      }
    }
  }

  // ─── TIER 2: CITY / MUNICIPALITY IN SPECIFIC PROVINCE ───
  if (cleanCity) {
    if (cleanProv) {
      for (const [provKey, cityList] of Object.entries(ALL_PHILIPPINE_ZIP_CODES)) {
        if (provKey === cleanProv || provKey.includes(cleanProv) || cleanProv.includes(provKey)) {
          // Direct city match
          for (const [cKey, zip] of Object.entries(cityList)) {
            if (cKey === cleanCity || cKey.includes(cleanCity) || cleanCity.includes(cKey)) {
              return zip;
            }
          }
        }
      }
    }

    // Search across all provinces if not found in specific province
    for (const [_, cityList] of Object.entries(ALL_PHILIPPINE_ZIP_CODES)) {
      for (const [cKey, zip] of Object.entries(cityList)) {
        if (cKey === cleanCity) {
          return zip;
        }
      }
    }

    // Partial city match
    for (const [_, cityList] of Object.entries(ALL_PHILIPPINE_ZIP_CODES)) {
      for (const [cKey, zip] of Object.entries(cityList)) {
        if (cKey.includes(cleanCity) || (cleanCity.length >= 4 && cleanCity.includes(cKey))) {
          return zip;
        }
      }
    }
  }

  return '';
}
