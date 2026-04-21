import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language.split("-")[0];
  }, [i18n.language]);

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={i18n.language.split("-")[0]} // fallback out region codes
        onValueChange={(value) => i18n.changeLanguage(value)}
      >
        <SelectTrigger className="w-[110px] h-9 border-none bg-transparent shadow-none hover:bg-accent focus:ring-0">
          <SelectValue placeholder="Langue" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fr">Français</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
