/*
--------------------------------------------------------------------------------
 PSEUDO-CODE GÉNÉRAL DU TRAITEMENT
--------------------------------------------------------------------------------
1. Lire le fichier 'coordonnees.txt' depuis Cloud Storage.
   - Le fichier est tabulé avec un en-tête ("UID\tLatitude\tLongitude") et
     utilise la virgule comme séparateur décimal (ex: "45,5534").
2. Parser les lignes (en ignorant l'en-tête) pour obtenir des objets { uid, lat, lon }.
   - Remplacer la virgule par un point pour convertir correctement en nombre.
3. Lire le fichier GeoJSON 'plan-culture.geojson' depuis Cloud Storage et le parser.
4. Pour chaque coordonnée, construire un point GeoJSON et vérifier s'il est dans
   l'un des polygones à l'aide de booleanPointInPolygon (de Turf.js).
   - Si une intersection est trouvée, extraire les propriétés (clecomposite, nochamp,
     culture, variete, nosemi, date_semi) du polygone correspondant.
5. Construire un fichier CSV avec un en-tête et une ligne par correspondance trouvée.
6. Sauvegarder le CSV sous le nom "resultat.csv" dans le bucket Cloud Storage.
7. Renvoyer une réponse HTTP indiquant le nombre de résultats trouvés.
--------------------------------------------------------------------------------
*/


// --------------------------------------------
// 1. IMPORT DES LIBRAIRIES
// --------------------------------------------
import { Storage } from '@google-cloud/storage';  // Pour accéder à Cloud Storage
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';  // Pour vérifier l'intersection point-polygone
import { Feature, Point } from 'geojson';  // Types pour respecter le format GeoJSON

// --------------------------------------------
// 2. DÉCLARATION DES INTERFACES ET TYPES
// --------------------------------------------

/**
 * Interface représentant une coordonnée avec identifiant.
 * @property uid - Identifiant unique de la coordonnée (string).
 * @property lat - Latitude (number), convertie en utilisant le point comme séparateur décimal.
 * @property lon - Longitude (number), convertie en utilisant le point comme séparateur décimal.
 */
interface Coordinate {
  uid: string;
  lat: number;
  lon: number;
}

// --------------------------------------------
// 3. FONCTION DE PARSING DES LIGNES DE COORDONNÉES
// --------------------------------------------

/**
 * Transforme une ligne de texte du fichier 'coordonnees.txt' en un objet Coordinate.
 * Le fichier est supposé être tabulé et avoir un en-tête.
 * Exemple de ligne (après l'en-tête) : "01egDMwK2V9gxBIzMQG0	45,28529978	-74,28007563"
 *
 * @param line - La ligne brute du fichier.
 * @returns Un objet Coordinate ou null si la ligne est invalide.
 */
function parseCoordinateLine(line: string): Coordinate | null {
  if (!line) return null;
  // Séparer la ligne par tabulation
  const parts = line.trim().split('\t');
  // On s'attend à au moins 3 colonnes : UID, Latitude, Longitude
  if (parts.length < 3) return null;

  const uid = parts[0].trim();
  // Remplacer la virgule par un point pour convertir correctement en nombre
  const lat = parseFloat(parts[1].trim().replace(',', '.'));
  const lon = parseFloat(parts[2].trim().replace(',', '.'));

  if (!uid || isNaN(lat) || isNaN(lon)) return null;
  return { uid, lat, lon };
}

// --------------------------------------------
// 4. FONCTION PRINCIPALE DE LA CLOUD FUNCTION
// --------------------------------------------

/**
 * Cloud Function déclenchée par une requête HTTP.
 * Traite un fichier de coordonnées et un fichier GeoJSON pour déterminer
 * quels points se trouvent à l'intérieur de quels polygones, et génère un CSV.
 *
 * @param req - La requête HTTP entrante.
 * @param res - La réponse HTTP à renvoyer.
 */
export async function processCoordinates(req: any, res: any): Promise<void> {
  // Variables de configuration
  const storage = new Storage();
  const bucketName = 'exercice-ayoub';  // Nom du bucket Cloud Storage
  const coordsFileName = 'coordonnees.txt';  // Fichier contenant les coordonnées
  const geojsonFileName = 'plan-culture.geojson';  // Fichier GeoJSON contenant les polygones

  try {
    // --------------------------------------------
    // a) Lecture et parsing du fichier de coordonnées
    // --------------------------------------------
    const bucket = storage.bucket(bucketName);
    const [coordsData] = await bucket.file(coordsFileName).download();
    // Conversion en string et séparation en lignes
    const lines = coordsData.toString('utf-8').split(/\r?\n/);

    // Ignorer la première ligne (en-tête) et parser les autres lignes
    const coordinates = lines.slice(1)
      .map(parseCoordinateLine)
      .filter((coord): coord is Coordinate => coord !== null);

    // --------------------------------------------
    // b) Lecture et parsing du fichier GeoJSON
    // --------------------------------------------
    const [geoData] = await bucket.file(geojsonFileName).download();
    const geoJson = JSON.parse(geoData.toString('utf-8'));
    const features = geoJson.features;  // Tableau de polygones

    // --------------------------------------------
    // c) Traitement des intersections point-polygone
    // --------------------------------------------
    const results = coordinates.map(coord => {
      // Créer un objet point GeoJSON respectant le format attendu par Turf.js
      const point: Feature<Point> = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [coord.lon, coord.lat]  // Note: ordre [lon, lat]
        },
        properties: {}
      };

      // Parcourir les polygones pour vérifier si le point se trouve à l'intérieur
      for (const feature of features) {
        if (booleanPointInPolygon(point, feature)) {
          // Extraire les propriétés du polygone
          const props = feature.properties;
          return {
            uid: coord.uid,
            lat: coord.lat,
            lon: coord.lon,
            clecomposite: props.clecomposite || '',
            nochamp: props.nochamp || '',
            culture: props.culture || '',
            variete: props.variete || '',
            nosemi: props.nosemi || '',
            date_semi: props.date_semi || ''
          };
        }
      }
      // Si aucun polygone ne contient le point, retourner null
      return null;
    }).filter(result => result !== null);

    // --------------------------------------------
    // d) Construction du CSV à partir des résultats
    // --------------------------------------------
    const header = 'uid,latitude,longitude,clecomposite,nochamp,culture,variete,nosemi,date_semi';
    const csvContent = [
      header,
      ...results.map(r =>
        `${r!.uid},${r!.lat},${r!.lon},${r!.clecomposite},${r!.nochamp},${r!.culture},${r!.variete},${r!.nosemi},${r!.date_semi}`
      )
    ].join('\n');

    // --------------------------------------------
    // e) Sauvegarde du fichier CSV dans le bucket
    // --------------------------------------------
    await bucket.file('resultat.csv').save(csvContent, { contentType: 'text/csv' });

    // --------------------------------------------
    // f) Réponse HTTP
    // --------------------------------------------
    res.status(200).send(`Succès ! ${results.length} résultats écrits dans resultat.csv.`);
  } catch (error: any) {
    // Gestion des erreurs
    console.error("Erreur lors du traitement :", error);
    res.status(500).send(`Erreur interne : ${error.message}`);
  }
}
