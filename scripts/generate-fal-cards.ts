/**
 * Generate 6 profile cards by sending requests to FAL.ai via the worker
 */

const WORKER_URL = 'https://interactive-display.eugene-ff3.workers.dev';
const API_KEY = '5CSVqaHCxtWPL1PSEbMlMbI3AVeZmQh5';

// Random Unsplash face images
const unsplashImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', // Professional man
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80', // Professional woman
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80', // Casual man
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80', // Casual woman
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80', // Young professional
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80', // Young woman
];

type ProfileType = 'guardian' | 'steward' | 'shaper' | 'guardian-steward' | 'steward-shaper' | 'adaptive-guardian';

// Scene descriptions for each profile type
const profileScenes: Record<ProfileType, string> = {
  guardian: 'medium close-up portrait of a single person standing confidently, wearing a plain dark blue police uniform with no text, badges, or logos. A white and blue police patrol car is parked behind them. The Merlion is visible in the background near Marina Bay, with the orderly civic skyline beyond. Clean public space, looking directly at the camera',

  steward: 'medium close-up portrait of a single person standing inside a Singapore Community Club. Behind the person, a clearly visible community club activity board displays posters for neighbourhood events, classes, and workshops. Multi-purpose rooms with tables and chairs are visible, and a blurred mix of residents of different ages and backgrounds are engaged in activities. The setting features clean public interiors typical of Singapore community clubs, with warm indoor lighting and an orderly, welcoming atmosphere. The person is mid-gesture in a calm, guiding manner and looks toward the camera with a composed, approachable expression',

  shaper: 'a single person holding a glowing holographic tablet, standing on an elevated waterfront promenade overlooking Marina Bay. Marina Bay Sands dominates the background, integrated into a smart city skyline with illuminated data overlays, digital interfaces, and connected infrastructure. Autonomous transport routes and smart urban systems are subtly visualised around the skyline. Cool blue and teal lighting, the person stands confidently and looks directly at the camera',

  'guardian-steward': 'a single person organizing food supplies at a Singapore community soup kitchen located within a public service facility. Large pots of soup and trays of vegetables are in the foreground, with blurred volunteers behind. The environment resembles a neighbourhood polyclinic or community hub, warm indoor lighting, looking at the camera',

  'steward-shaper': 'a single person leaning forward demonstrating a smartphone to an elderly person seen from behind with grey hair. The scene takes place inside Jewel Changi Airport, with indoor greenery, glass architecture, and natural light filtering through. Warm, friendly atmosphere focused on inclusion and learning',

  'adaptive-guardian': 'a single person standing in a modern cybersecurity operations centre. Multiple screens display network monitoring dashboards and security alerts. Through glass walls, Changi Airport\'s control infrastructure or runway lighting is visible in the distance. Blue ambient lighting, looking confidently at the camera',
};

const profileStyles: Record<ProfileType, string> = {
  guardian: 'professional and reassuring atmosphere, structured composition, warm tropical daylight, clean civic surroundings around Marina Bay, modern Singapore public infrastructure, contemporary photography style',

  steward: 'warm and welcoming atmosphere, soft golden hour tropical lighting, heartland community setting, everyday Singapore life, vibrant but gentle colours, documentary photography style',

  shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with subtle neon highlights, Marina Bay Sands-centred futuristic skyline, sleek modern composition, cinematic style grounded in realism',

  'guardian-steward': 'balanced atmosphere of security and warmth, organized yet welcoming composition, public service and community care setting, natural tropical lighting, professional documentary style',

  'steward-shaper': 'optimistic and progressive atmosphere, bright modern tropical lighting, Jewel Changi\'s greenery and glass architecture, inclusive composition showing people and technology, contemporary lifestyle photography style',

  'adaptive-guardian': 'confident and forward-looking atmosphere, dramatic cool-toned lighting, advanced operations environment linked to Changi Airport infrastructure, dynamic cinematic composition',
};

function buildPrompt(profileType: ProfileType): string {
  const scene = profileScenes[profileType];
  const style = profileStyles[profileType];

  return `A photorealistic medium close-up scene of ${scene}. Set in an authentic Singapore environment with curated iconic landmarks or public spaces that symbolically match the profile. Recognisable local architectural details, urban greenery, and everyday Singapore elements are clearly visible. ${style}. High quality, highly detailed, realistic lighting, 8k resolution. The person is naturally integrated into the environment, with no visible text, logos, or branded symbols. Non-touristy, contemporary Singapore realism.`;
}

const profiles: ProfileType[] = [
  'guardian',
  'steward',
  'shaper',
  'guardian-steward',
  'steward-shaper',
  'adaptive-guardian',
];

async function fetchImageAsBase64(url: string): Promise<string> {
  console.log(`Fetching image: ${url}`);
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

async function generateCard(profile: ProfileType, imageUrl: string): Promise<string | null> {
  console.log(`\n🎨 Generating card for: ${profile}`);

  try {
    // Fetch the image and convert to base64
    const photoData = await fetchImageAsBase64(imageUrl);
    console.log(`  Photo size: ${Math.round(photoData.length / 1024)}KB`);

    // Build the prompt for this profile
    const prompt = buildPrompt(profile);
    console.log(`  Prompt: ${prompt.substring(0, 100)}...`);

    // Call the worker API
    console.log(`  Calling worker API...`);
    const response = await fetch(`${WORKER_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        photo: photoData,
        prompt: prompt,
        timePeriod: profile,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`  ❌ Error: ${response.status} - ${error}`);
      return null;
    }

    const data = await response.json() as { imageUrl: string; r2Path: string };
    console.log(`  ✅ Generated: ${data.imageUrl}`);
    console.log(`  📁 R2 Path: ${data.r2Path}`);

    return data.imageUrl;
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting FAL.ai card generation for 6 profiles\n');

  const results: Record<string, string | null> = {};

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const imageUrl = unsplashImages[i];

    const result = await generateCard(profile, imageUrl);
    results[profile] = result;

    // Small delay between requests
    if (i < profiles.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next request...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n\n📊 RESULTS SUMMARY');
  console.log('==================');
  for (const [profile, url] of Object.entries(results)) {
    console.log(`${profile}: ${url || 'FAILED'}`);
  }
}

main().catch(console.error);
