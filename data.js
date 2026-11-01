window.TW = window.TW || {};
TW.UK_CENTER = [54.2, -2.5];
TW.CITIES = [
  {
    "name": "London",
    "lat": 51.5074,
    "lng": -0.1278,
    "region": "Greater London"
  },
  {
    "name": "Manchester",
    "lat": 53.4808,
    "lng": -2.2426,
    "region": "North West"
  },
  {
    "name": "Birmingham",
    "lat": 52.4862,
    "lng": -1.8904,
    "region": "West Midlands"
  },
  {
    "name": "Leeds",
    "lat": 53.8008,
    "lng": -1.5491,
    "region": "Yorkshire"
  },
  {
    "name": "Glasgow",
    "lat": 55.8642,
    "lng": -4.2518,
    "region": "Scotland"
  },
  {
    "name": "Edinburgh",
    "lat": 55.9533,
    "lng": -3.1883,
    "region": "Scotland"
  },
  {
    "name": "Cardiff",
    "lat": 51.4816,
    "lng": -3.1791,
    "region": "Wales"
  },
  {
    "name": "Bristol",
    "lat": 51.4545,
    "lng": -2.5879,
    "region": "South West"
  },
  {
    "name": "Newcastle",
    "lat": 54.9783,
    "lng": -1.6178,
    "region": "North East"
  },
  {
    "name": "Belfast",
    "lat": 54.5973,
    "lng": -5.9301,
    "region": "Northern Ireland"
  },
  {
    "name": "Exeter",
    "lat": 50.7184,
    "lng": -3.5339,
    "region": "South West"
  },
  {
    "name": "Norwich",
    "lat": 52.6309,
    "lng": 1.2974,
    "region": "East of England"
  },
  {
    "name": "York",
    "lat": 53.96,
    "lng": -1.0873,
    "region": "Yorkshire"
  },
  {
    "name": "Inverness",
    "lat": 57.4778,
    "lng": -4.2247,
    "region": "Scotland"
  },
  {
    "name": "Swansea",
    "lat": 51.6214,
    "lng": -3.9436,
    "region": "Wales"
  }
];
TW.CITIES.push(
  { name: "Southampton", lat: 50.9097, lng: -1.4044, region: "South East" },
  { name: "Nottingham", lat: 52.9548, lng: -1.1581, region: "East Midlands" },
  { name: "Sheffield", lat: 53.3811, lng: -1.4701, region: "Yorkshire and the Humber" },
  { name: "Liverpool", lat: 53.4084, lng: -2.9916, region: "North West" },
  { name: "Leicester", lat: 52.6369, lng: -1.1398, region: "East Midlands" }
);
TW.SPECIES = [
  {
    "id": "ixodes_ricinus",
    "commonName": "Castor bean / sheep tick",
    "latinName": "Ixodes ricinus",
    "risk": "Primary UK vector of Lyme disease (Borrelia) and tick-borne encephalitis virus in some regions.",
    "hosts": "Deer, sheep, dogs, livestock, people — waits on grass and woodland edges.",
    "lookFor": "Red-brown body, dark scutum, long palps. Unfed adults ~3 mm; engorged females swell to a grey bean.",
    "colour": "#2f6b4f"
  },
  {
    "id": "ixodes_hexagonus",
    "commonName": "Hedgehog tick",
    "latinName": "Ixodes hexagonus",
    "risk": "Can transmit Borrelia; often found on pets that investigate hedgerows and gardens.",
    "hosts": "Hedgehogs, foxes, dogs and cats in gardens and urban green space.",
    "lookFor": "Hexagonal scutum when viewed from above, similar size to I. ricinus.",
    "colour": "#3d6b8a"
  },
  {
    "id": "dermacentor_reticulatus",
    "commonName": "Ornate cow tick",
    "latinName": "Dermacentor reticulatus",
    "risk": "Vector of canine babesiosis; expanding range in Wales, south-west England and Essex.",
    "hosts": "Dogs, livestock, wildlife. Prefers damp grassland and coastal dunes.",
    "lookFor": "Ornate white-marbled scutum, shorter palps than Ixodes, festoons on the rear edge.",
    "colour": "#8a4a2a"
  },
  {
    "id": "haemaphysalis_punctata",
    "commonName": "Red sheep tick",
    "latinName": "Haemaphysalis punctata",
    "risk": "Can transmit Theileria and other livestock pathogens; occasional bites on people.",
    "hosts": "Sheep and cattle on coastal and downland pasture, especially south-east England.",
    "lookFor": "Short palps, rectangular basis capituli, reddish-brown without an ornate pattern.",
    "colour": "#9a3d4a"
  },
  {
    "id": "rhipicephalus_sanguineus",
    "commonName": "Brown dog tick",
    "latinName": "Rhipicephalus sanguineus",
    "risk": "Can establish indoors; associated with canine ehrlichiosis and Mediterranean spotted fever abroad.",
    "hosts": "Dogs. Increasingly reported after travel or in heated kennels.",
    "lookFor": "Hexagonal basis capituli, reddish-brown, often found in kennels rather than woodland.",
    "colour": "#5c4a7a"
  },
  {
    "id": "unknown",
    "commonName": "Unidentified tick",
    "latinName": "Species not confirmed",
    "risk": "Treat as potentially infectious until identified. Photograph and seek expert ID if possible.",
    "hosts": "Unknown",
    "lookFor": "Any eight-legged arachnid attached to skin or clothing after outdoor activity.",
    "colour": "#5b5348"
  }
];
