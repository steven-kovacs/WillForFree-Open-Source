import { validPlace } from "./places.js";

export const activeOn = (campaign, day) => campaign.start <= day && day <= campaign.end;
export function selectCampaign(campaigns, place, day) {
  if (!validPlace(place)) return null;
  const active = campaigns.filter(campaign => activeOn(campaign, day));
  const local = place.region && active.find(campaign => campaign.areas.includes(place.country + "-" + place.region));
  return local || active.find(campaign => campaign.areas.includes(place.country)) || null;
}
