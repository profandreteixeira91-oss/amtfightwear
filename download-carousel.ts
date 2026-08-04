
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "public/ads/carousel";
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const concepts = [
  {
    id: "jiu-jitsu-belts",
    name: "Faixas de Jiu-Jitsu",
    url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=1024",
  },
  {
    id: "judo-belts",
    name: "Faixas de Judô",
    url: "https://images.unsplash.com/photo-1599351431247-f13b3828e1a8?auto=format&fit=crop&q=80&w=1024",
  },
  {
    id: "embroidered-belts",
    name: "Faixas Bordadas",
    url: "https://images.unsplash.com/photo-1541534741688-6078c64b591d?auto=format&fit=crop&q=80&w=1024",
  },
  {
    id: "premium-kimono",
    name: "Kimono Premium",
    url: "https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&q=80&w=1024",
  },
  {
    id: "custom-belts-mix",
    name: "Mix de Faixas Personalizadas",
    url: "https://images.unsplash.com/photo-1517438322351-1748888788e2?auto=format&fit=crop&q=80&w=1024",
  }
];

async function downloadPlaceholders() {
  console.log("Iniciando download de imagens de alta qualidade para o carrossel...");

  for (const concept of concepts) {
    try {
      console.log(`Baixando: ${concept.name}...`);
      const res = await fetch(concept.url);
      const buffer = await res.arrayBuffer();
      
      const filePath = path.join(OUTPUT_DIR, `${concept.id}.png`);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log(`Salvo: ${filePath}`);
    } catch (e) {
      console.error(`Falha ao baixar ${concept.id}:`, e);
    }
  }
}

downloadPlaceholders();
