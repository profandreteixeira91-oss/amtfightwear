import { Check } from "lucide-react";

interface TechSpecsProps {
  description: string;
}

export function TechSpecs({ description }: TechSpecsProps) {
  // Se não houver descrição ou não parecer ser a ficha técnica estruturada, renderiza normal
  if (!description || !description.includes("CARACTERÍSTICAS TÉCNICAS")) {
    return <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground">{description}</div>;
  }

  // Tenta extrair os itens da lista markdown
  const lines = description.split("\n");
  const specs: { label: string; value: string }[] = [];
  
  lines.forEach(line => {
    const match = line.match(/^\*\s*\*\*(.*?):\*\*(.*)/);
    if (match) {
      specs.push({
        label: match[1].trim(),
        value: match[2].trim()
      });
    }
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specs.map((spec, i) => (
          <div 
            key={i} 
            className="flex flex-col gap-1 rounded-xl border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              {spec.label}
            </span>
            <span className="text-sm font-medium text-foreground">
              {spec.value}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-neutral-900 p-6 text-white sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Performance & DNA</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>
        
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            "High Intensity Approved",
            "4-Way Stretch Tech",
            "Moisture Control",
            "Reinforced Seams"
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
