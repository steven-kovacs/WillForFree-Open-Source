// Countries and regions available in the location picker.
const countries = [
  ["CA", "Canada"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["NL", "Netherlands"],
  ["DK", "Denmark"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["FI", "Finland"],
  ["DE", "Germany"],
  ["AT", "Austria"],
  ["CH", "Switzerland"],
  ["BE", "Belgium"],
  ["LU", "Luxembourg"],
  ["IS", "Iceland"],
  ["MT", "Malta"],
  ["PT", "Portugal"],
  ["EE", "Estonia"],
  ["CZ", "Czechia"],
  ["PL", "Poland"],
  ["HR", "Croatia"],
  ["SK", "Slovakia"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["SG", "Singapore"],
];
export const markets = Object.freeze(Object.fromEntries(countries));
const pairs = (value) =>
  Object.fromEntries(value.split("|").map((pair) => pair.split(":")));
export const regions = {
  CA: pairs(
    "AB:Alberta|BC:British Columbia|MB:Manitoba|NB:New Brunswick|NL:Newfoundland and Labrador|NS:Nova Scotia|NT:Northwest Territories|NU:Nunavut|ON:Ontario|PE:Prince Edward Island|QC:Quebec|SK:Saskatchewan|YT:Yukon",
  ),
  US: pairs(
    "AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming",
  ),
  GB: pairs("ENG:England|WLS:Wales|SCT:Scotland|NIR:Northern Ireland"),
  AU: pairs(
    "ACT:Australian Capital Territory|NSW:New South Wales|NT:Northern Territory|QLD:Queensland|SA:South Australia|TAS:Tasmania|VIC:Victoria|WA:Western Australia",
  ),
};
export function validPlace(v) {
  return Boolean(
    v &&
    typeof v === "object" &&
    typeof v.country === "string" &&
    typeof v.region === "string" &&
    Object.hasOwn(markets, v.country) &&
    (regions[v.country]
      ? Object.hasOwn(regions[v.country], v.region)
      : v.region === ""),
  );
}
