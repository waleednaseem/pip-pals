import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Upload, Trash, Youtube, ImageIcon, Video } from "lucide-react";
import { Ad, AdType, AD_TYPE_META } from "@/types/ads";
import {
  addAd,
  deleteAd,
  extractYoutubeId,
  fileToBase64,
  getAdsData,
  MAX_MEDIA_FILE_BYTES,
  toggleAdActive,
} from "@/utils/ads";
import { useToast } from "@/hooks/use-toast";

export const AdvertisingTab = () => {
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [type, setType] = useState<AdType>("banner");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAds(getAdsData().ads);
  }, []);

  const refresh = () => setAds(getAdsData().ads);

  const resetForm = () => {
    setTitle("");
    setLinkUrl("");
    setYoutubeUrl("");
    setMediaData(null);
    setMediaKind(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MEDIA_FILE_BYTES) {
      toast({
        title: "File is too large",
        description: `Max size is ${(MAX_MEDIA_FILE_BYTES / 1024 / 1024).toFixed(1)}MB. Please upload a smaller file.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const kind = file.type.startsWith("video/") ? "video" : "image";
    try {
      const base64 = await fileToBase64(file);
      setMediaData(base64);
      setMediaKind(kind);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleAdd = () => {
    if (!title.trim()) {
      toast({ title: "Enter an ad title", variant: "destructive" });
      return;
    }
    if (type === "youtube") {
      if (!extractYoutubeId(youtubeUrl)) {
        toast({ title: "Enter a valid YouTube link", variant: "destructive" });
        return;
      }
    } else if (!mediaData) {
      toast({ title: "Upload an image or video", variant: "destructive" });
      return;
    }

    addAd({
      type,
      title: title.trim(),
      mediaKind: mediaKind || undefined,
      mediaData: mediaData || undefined,
      youtubeUrl: type === "youtube" ? youtubeUrl.trim() : undefined,
      linkUrl: linkUrl.trim() || undefined,
      active: true,
    });

    refresh();
    resetForm();
    toast({ title: "Ad added", description: "It will now show across the app" });
  };

  const handleDelete = (id: string) => {
    deleteAd(id);
    refresh();
  };

  const handleToggle = (id: string) => {
    toggleAdActive(id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Create Ad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ad Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AdType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AD_TYPE_META) as AdType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {AD_TYPE_META[t].label} — {AD_TYPE_META[t].description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer Sale"
              />
            </div>
          </div>

          {type === "youtube" ? (
            <div className="space-y-2">
              <Label>YouTube Link</Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Upload Image / Video (max {(MAX_MEDIA_FILE_BYTES / 1024 / 1024).toFixed(1)}MB)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              {mediaData && (
                <div className="rounded-md border p-2 max-w-xs">
                  {mediaKind === "video" ? (
                    <video src={mediaData} className="w-full rounded" muted controls />
                  ) : (
                    <img src={mediaData} className="w-full rounded" alt="preview" />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Click-through Link (optional)</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <Button onClick={handleAdd} className="gap-2">
            <Upload className="h-4 w-4" />
            Add Ad
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ads List ({ads.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No ads yet. Create one above.
            </p>
          ) : (
            ads.map((ad) => (
              <div
                key={ad.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <div className="h-14 w-20 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center">
                  {ad.type === "youtube" ? (
                    <Youtube className="h-6 w-6 text-muted-foreground" />
                  ) : ad.mediaKind === "video" ? (
                    <video src={ad.mediaData} className="h-full w-full object-cover" muted />
                  ) : ad.mediaData ? (
                    <img src={ad.mediaData} className="h-full w-full object-cover" alt={ad.title} />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{ad.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs gap-1">
                      {ad.type === "youtube" ? <Youtube className="h-3 w-3" /> : ad.mediaKind === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                      {AD_TYPE_META[ad.type].label}
                    </Badge>
                    <Badge className={ad.active ? "bg-emerald-500" : "bg-muted-foreground"}>
                      {ad.active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                </div>
                <Switch checked={ad.active} onCheckedChange={() => handleToggle(ad.id)} />
                <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)}>
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
