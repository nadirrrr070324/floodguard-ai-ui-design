import { CloudRain, Sun, Cloud, CloudLightning, Cloudy } from "lucide-react";

interface AnimatedWeatherIconProps {
  condition: string;
  className?: string;
  iconSize?: string;
  dim?: boolean;
}

export function AnimatedWeatherIcon({ condition, className = "h-6 w-6", iconSize = "h-6 w-6", dim = false }: AnimatedWeatherIconProps) {
  const n = condition.toLowerCase();

  // Rain / showery animation
  if (n.includes("rain") || n.includes("storm") || n.includes("shower") || n.includes("drizzle")) {
    return (
      <div className={`relative ${className} ${dim ? "opacity-80" : ""}`}>
        <CloudRain className={`${iconSize} text-blue-500`} />
        <div className="absolute inset-0 animate-pulse">
          <div className="absolute bottom-0 left-[47%] h-1 w-0.5 bg-blue-400/50 animate-[rain-drop_1s_ease-in_infinite]" />
          <div className="absolute bottom-0 left-[30%] h-1 w-0.5 bg-blue-400/50 animate-[rain-drop_1.2s_ease-in_infinite_0.2s]" />
          <div className="absolute bottom-0 left-[63%] h-1 w-0.5 bg-blue-400/50 animate-[rain-drop_0.8s_ease-in_infinite_0.4s]" />
        </div>
      </div>
    );
  }

  // Thunder animation
  if (n.includes("thunder") || n.includes("lightning")) {
    return (
      <div className={`relative ${className}`}>
        <CloudLightning className={`${iconSize} text-amber-500 animate-[lightning-flash_2s_ease-in-out_infinite]`} />
      </div>
    );
  }

  // Cloudy / overcast / fog animation
  if (n.includes("cloud") || n.includes("overcast") || n.includes("fog")) {
    return (
      <div className={`relative ${className}`}>
        <Cloudy className={`${iconSize} text-slate-400 animate-[cloud-float_4s_ease-in-out_infinite]`} />
      </div>
    );
  }

  // Partly cloudy — small cloud next to the sun
  if (n.includes("partly")) {
    return (
      <div className={`relative ${className}`}>
        <Sun className={`${iconSize} text-amber-400`} />
        <Cloud className={`${iconSize} absolute -right-0.5 top-0 text-slate-400 animate-[cloud-float_4s_ease-in-out_infinite]`} />
      </div>
    );
  }

  // Sunny animation (default)
  return (
    <div className={`relative ${className}`}>
      <Sun className={`${iconSize} text-amber-400 animate-[sun-rotate_10s_linear_infinite]`} />
      <div className="absolute inset-0 animate-[sun-pulse_2s_ease-in-out_infinite]">
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md" />
      </div>
    </div>
  );
}