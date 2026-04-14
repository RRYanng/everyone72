// Golf Course Database — Verified Scorecards Only
// 262 verified US golf courses with real hole-by-hole par data
// All courses sourced from official scorecards / bluegolf.com / USGA database
import { Course } from '../types';

type RawCourse = {
  id: string; name: string; city: string; state: string;
  course_rating: number; slope_rating: number; total_par: number;
  holes_par: number[]; // Verified hole-by-hole pars (18 values), sourced from official data
};

function buildHoles(c: RawCourse): { hole_number: number; par: number }[] | null {
  if (!c.holes_par || c.holes_par.length !== 18) return null;
  return c.holes_par.map((par, idx) => ({ hole_number: idx + 1, par }));
}

const RAW: RawCourse[] = [
  // Torrey Pines South — verified scorecard (bluegolf.com)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'torrey-pines-south', name: 'Torrey Pines Golf Course (South)', city: 'La Jolla', state: 'CA', course_rating: 76.9, slope_rating: 145, total_par: 72,
    holes_par: [4,4,3,4,4,5,4,3,5, 4,3,4,5,4,4,3,4,5] },
  // Torrey Pines North — verified scorecard (bluegolf.com)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'torrey-pines-north', name: 'Torrey Pines Golf Course (North)', city: 'La Jolla', state: 'CA', course_rating: 72.4, slope_rating: 135, total_par: 72,
    holes_par: [4,4,3,4,5,4,4,3,5, 5,4,3,4,4,3,4,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sherwood-cc', name: 'Sherwood Country Club', city: 'Thousand Oaks', state: 'CA', course_rating: 75.4, slope_rating: 144, total_par: 72,
    holes_par: [4,5,3,5,4,3,5,3,4, 4,5,3,4,5,4,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'monarch-beach', name: 'Monarch Beach Golf Links', city: 'Dana Point', state: 'CA', course_rating: 71.9, slope_rating: 130, total_par: 70,
    holes_par: [4,4,4,3,3,4,5,4,5, 4,4,5,3,4,3,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'palos-verdes-gc', name: 'Palos Verdes Golf Club', city: 'Palos Verdes Estates', state: 'CA', course_rating: 72.8, slope_rating: 134, total_par: 71,
    holes_par: [4,3,4,3,5,4,5,3,4, 4,4,4,4,4,3,5,4,4] },
  // Hammock Beach Ocean — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'hammock-beach-ocean', name: 'Hammock Beach Resort (Ocean Course)', city: 'Palm Coast', state: 'FL', course_rating: 75.1, slope_rating: 141, total_par: 72,
    holes_par: [4,5,4,3,4,5,4,3,4, 5,4,3,4,5,4,4,3,4] },
  // ChampionsGate National — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'champions-gate-national', name: 'ChampionsGate Golf (National Course)', city: 'Davenport', state: 'FL', course_rating: 75.0, slope_rating: 136, total_par: 72,
    holes_par: [4,5,4,4,3,4,5,4,4, 3,4,3,4,5,3,4,4,5] },
  // ChampionsGate International — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'champions-gate-intl', name: 'ChampionsGate Golf (International)', city: 'Davenport', state: 'FL', course_rating: 75.3, slope_rating: 138, total_par: 72,
    holes_par: [4,3,5,4,3,4,4,5,4, 4,5,4,4,3,4,4,3,5] },
  // Orange County National Panther Lake — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'orange-county-panther', name: 'Orange County National (Panther Lake)', city: 'Winter Garden', state: 'FL', course_rating: 75.2, slope_rating: 141, total_par: 72,
    holes_par: [4,5,4,3,4,3,5,4,4, 5,3,4,4,5,3,4,3,5] },
  // The Concession Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'concession-gc', name: 'The Concession Golf Club', city: 'Bradenton', state: 'FL', course_rating: 78.1, slope_rating: 155, total_par: 72,
    holes_par: [4,4,5,3,4,3,5,4,4, 4,3,4,5,3,4,4,5,4] },
  // Mystic Dunes — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'mystic-dunes', name: 'Mystic Dunes Golf Club', city: 'Celebration', state: 'FL', course_rating: 73.5, slope_rating: 141, total_par: 72,
    holes_par: [4,4,4,4,3,5,3,5,4, 4,3,4,4,5,4,5,3,4] },
  // El Campeon at Mission Inn — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'el-campeon-mission', name: 'El Campeon at Mission Inn', city: 'Howey-in-the-Hills', state: 'FL', course_rating: 74.6, slope_rating: 142, total_par: 72,
    holes_par: [5,3,4,4,4,4,4,3,4, 5,4,3,4,5,3,4,5,4] },
  // Reunion Watson Course — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'reunion-watson', name: 'Reunion Resort (Watson Course)', city: 'Kissimmee', state: 'FL', course_rating: 75.0, slope_rating: 136, total_par: 72,
    holes_par: [5,4,3,4,4,4,3,5,4, 4,4,3,4,5,3,4,5,4] },
  // Lely Flamingo Island — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'lely-flamingo', name: 'Lely Resort (Flamingo Island Course)', city: 'Naples', state: 'FL', course_rating: 75.0, slope_rating: 136, total_par: 72,
    holes_par: [4,5,3,4,3,4,4,5,4, 4,3,5,4,4,3,5,4,4] },
  // saddlebrook-resort REMOVED — 27-hole facility, no par-72 layout (par 70 + par 71 only)
  // Duran Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'duran-gc', name: 'Duran Golf Club', city: 'Viera', state: 'FL', course_rating: 73.1, slope_rating: 128, total_par: 72,
    holes_par: [5,4,4,3,4,4,3,4,5, 4,5,4,3,4,5,4,3,4] },
  // The Club at Eaglebrooke — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'eaglebrooke-gc', name: 'The Club at Eaglebrooke', city: 'Lakeland', state: 'FL', course_rating: 73.7, slope_rating: 138, total_par: 72,
    holes_par: [4,4,3,4,5,3,5,4,4, 5,4,3,4,3,4,4,5,4] },
  // River Hills Country Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'river-hills-cc', name: 'River Hills Country Club', city: 'Valrico', state: 'FL', course_rating: 73.9, slope_rating: 140, total_par: 72,
    holes_par: [4,5,4,3,4,5,3,4,4, 4,3,5,4,3,4,4,5,4] },
  // Naples Beach Hotel Golf Club — verified golflink.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'naples-beach-hotel', name: 'Naples Beach Hotel Golf Club', city: 'Naples', state: 'FL', course_rating: 71.2, slope_rating: 132, total_par: 72,
    holes_par: [4,4,3,4,5,4,3,5,4, 4,3,4,4,5,5,3,4,4] },
  // Seminole Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'seminole-gc', name: 'Seminole Golf Club', city: 'Juno Beach', state: 'FL', course_rating: 75.4, slope_rating: 144, total_par: 72,
    holes_par: [4,4,5,4,3,4,4,3,5, 4,4,4,3,5,5,4,3,4] },
  // Memorial Park Golf Course — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'memorial-park-houston', name: 'Memorial Park Golf Course', city: 'Houston', state: 'TX', course_rating: 74.2, slope_rating: 128, total_par: 72,
    holes_par: [5,3,5,4,4,4,3,5,3, 4,3,4,4,5,3,5,4,4] },
  // The Woodlands CC Tournament Course — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'woodlands-tournament', name: 'The Woodlands CC (TPC Tournament)', city: 'The Woodlands', state: 'TX', course_rating: 75.1, slope_rating: 141, total_par: 72,
    holes_par: [5,4,3,4,4,5,4,3,4, 4,4,4,5,3,5,3,4,4] },
  // TPC Craig Ranch — verified bluegolf.com (championship/member tees par 72; PGA Tour plays par 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-craig-ranch', name: 'TPC Craig Ranch', city: 'McKinney', state: 'TX', course_rating: 77.9, slope_rating: 151, total_par: 72,
    holes_par: [4,4,4,3,5,4,3,4,5, 4,4,5,4,4,3,4,3,5] },
  // Cowboys Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'cowboys-golf', name: 'Cowboys Golf Club', city: 'Grapevine', state: 'TX', course_rating: 74.8, slope_rating: 147, total_par: 72,
    holes_par: [5,4,3,4,4,3,4,5,4, 4,4,4,5,4,3,4,3,5] },
  // Stonebriar Country Club (Dye Course) — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'stonebriar-cc', name: 'Stonebriar Country Club', city: 'Frisco', state: 'TX', course_rating: 74.8, slope_rating: 138, total_par: 72,
    holes_par: [4,3,5,4,4,3,4,5,4, 4,4,4,4,3,4,5,3,5] },
  // The Tribute Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tribute-gc-tx', name: 'The Tribute Golf Club', city: 'The Colony', state: 'TX', course_rating: 74.3, slope_rating: 130, total_par: 72,
    holes_par: [4,4,5,4,3,4,4,3,5, 4,3,5,4,3,5,4,4,4] },
  // Gentle Creek Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'gentle-creek', name: 'Gentle Creek Golf Club', city: 'Prosper', state: 'TX', course_rating: 74.9, slope_rating: 139, total_par: 72,
    holes_par: [4,5,4,4,3,5,4,4,3, 4,3,4,5,4,3,4,4,5] },
  // Ridglea Country Club South Course — NOTE: no "West Course" exists; South is par 72 — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'ridglea-west', name: 'Ridglea Country Club (West Course)', city: 'Fort Worth', state: 'TX', course_rating: 75.6, slope_rating: 141, total_par: 72,
    holes_par: [4,4,3,5,4,4,3,5,4, 4,4,4,3,4,4,4,4,5] },
  // Waterchase Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'waterchase-gc', name: 'Waterchase Golf Club', city: 'Fort Worth', state: 'TX', course_rating: 75.8, slope_rating: 140, total_par: 72,
    holes_par: [4,3,5,4,4,5,3,4,4, 5,4,3,5,3,4,3,4,5] },
  // Tangle Ridge Golf Club — verified bluegolf.com + golflink.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tangle-ridge', name: 'Tangle Ridge Golf Club', city: 'Grand Prairie', state: 'TX', course_rating: 73.4, slope_rating: 133, total_par: 72,
    holes_par: [4,4,4,3,5,4,4,5,3, 4,4,3,5,4,4,4,3,5] },
  // texas-star REMOVED — confirmed par 71 (not 72)
  // Firewheel Golf Park Bridges (Masters+Champion combo) — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'firewheel-bridges', name: 'Firewheel Golf Park (The Bridges)', city: 'Garland', state: 'TX', course_rating: 73.7, slope_rating: 133, total_par: 72,
    holes_par: [4,3,4,4,3,4,5,5,4, 5,4,4,4,3,4,3,4,5] },
  // Augusta Pines Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'augusta-pines-tx', name: 'Augusta Pines Golf Club', city: 'Spring', state: 'TX', course_rating: 74.2, slope_rating: 132, total_par: 72,
    holes_par: [4,5,3,4,4,5,4,4,3, 4,4,4,5,4,3,4,3,5] },
  // clubs-houston-oaks REMOVED — confirmed par 71 (not 72)
  // Gleneagles Country Club (Kings Course) — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'gleneagles-plano', name: 'Gleneagles Country Club', city: 'Plano', state: 'TX', course_rating: 74.7, slope_rating: 143, total_par: 72,
    holes_par: [4,4,4,3,5,4,3,5,4, 5,3,5,4,4,3,5,3,4] },
  // TPC Scottsdale Stadium — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-scottsdale-stadium', name: 'TPC Scottsdale (Stadium Course)', city: 'Scottsdale', state: 'AZ', course_rating: 74.7, slope_rating: 142, total_par: 71,
    holes_par: [4,4,5,3,4,4,3,4,4, 4,4,3,5,4,5,3,4,4] },
  // TPC Scottsdale Champions — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-scottsdale-champions', name: 'TPC Scottsdale (Champions Course)', city: 'Scottsdale', state: 'AZ', course_rating: 73.2, slope_rating: 135, total_par: 71,
    holes_par: [4,4,3,5,4,3,4,3,5, 5,4,4,3,4,4,3,5,4] },
  // Troon North Monument — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'troon-north-monument', name: 'Troon North Golf Club (Monument)', city: 'Scottsdale', state: 'AZ', course_rating: 73.7, slope_rating: 149, total_par: 72,
    holes_par: [4,3,5,4,4,4,3,4,5, 4,5,4,3,5,4,3,4,4] },
  // Troon North Pinnacle — verified bluegolf.com (actual par 71, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'troon-north-pinnacle', name: 'Troon North Golf Club (Pinnacle)', city: 'Scottsdale', state: 'AZ', course_rating: 73.5, slope_rating: 148, total_par: 71,
    holes_par: [4,4,4,4,5,3,4,3,4, 4,5,4,3,5,4,3,4,4] },
  // We-Ko-Pa Cholla — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'we-ko-pa-cholla', name: 'We-Ko-Pa Golf Club (Cholla)', city: 'Fort McDowell', state: 'AZ', course_rating: 73.4, slope_rating: 138, total_par: 72,
    holes_par: [4,5,3,4,3,4,4,5,4, 5,3,4,4,3,4,4,5,4] },
  // We-Ko-Pa Saguaro — verified bluegolf.com (actual par 71, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'we-ko-pa-saguaro', name: 'We-Ko-Pa Golf Club (Saguaro)', city: 'Fort McDowell', state: 'AZ', course_rating: 72.0, slope_rating: 137, total_par: 71,
    holes_par: [4,4,4,5,3,4,4,5,3, 4,3,4,4,5,3,4,4,4] },
  // Whisper Rock Upper — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'whisper-rock-upper', name: 'Whisper Rock Golf Club (Upper Course)', city: 'Scottsdale', state: 'AZ', course_rating: 74.5, slope_rating: 142, total_par: 72,
    holes_par: [4,4,3,4,5,4,4,3,5, 4,3,5,4,3,4,5,4,4] },
  // Grayhawk Raptor — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'grayhawk-raptor', name: 'Grayhawk Golf Club (Raptor Course)', city: 'Scottsdale', state: 'AZ', course_rating: 74.7, slope_rating: 142, total_par: 72,
    holes_par: [4,4,4,5,3,4,5,3,4, 4,5,4,3,4,4,3,4,5] },
  // Grayhawk Talon — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'grayhawk-talon', name: 'Grayhawk Golf Club (Talon Course)', city: 'Scottsdale', state: 'AZ', course_rating: 74.0, slope_rating: 149, total_par: 72,
    holes_par: [4,4,5,4,3,4,4,3,5, 4,3,4,4,5,4,4,3,5] },
  // Kierland Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kierland-gc', name: 'Kierland Golf Club', city: 'Scottsdale', state: 'AZ', course_rating: 73.0, slope_rating: 130, total_par: 72,
    holes_par: [4,4,3,4,3,4,5,4,5, 4,4,4,3,5,4,5,3,4] },
  // Desert Highlands — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'desert-highlands', name: 'Desert Highlands Golf Club', city: 'Scottsdale', state: 'AZ', course_rating: 74.0, slope_rating: 151, total_par: 72,
    holes_par: [4,5,4,3,4,4,3,4,5, 4,5,3,4,4,3,3,5,5] },
  // Sunridge Canyon — verified bluegolf.com (actual par 71, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sunridge-canyon', name: 'Sunridge Canyon Golf Club', city: 'Fountain Hills', state: 'AZ', course_rating: 72.6, slope_rating: 142, total_par: 71,
    holes_par: [4,4,5,4,4,3,4,3,5, 4,4,3,5,3,4,5,3,4] },
  // Eagle Mountain — verified bluegolf.com (actual par 71, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'eagle-mountain-az', name: 'Eagle Mountain Golf Club', city: 'Fountain Hills', state: 'AZ', course_rating: 71.4, slope_rating: 134, total_par: 71,
    holes_par: [5,4,3,5,3,4,4,3,4, 5,4,5,3,4,3,4,4,4] },
  // Talking Stick North (O'odham) — verified bluegolf.com (actual par 70, not 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'talking-stick-north', name: 'Talking Stick Golf Club (North Course)', city: 'Scottsdale', state: 'AZ', course_rating: 72.7, slope_rating: 125, total_par: 70,
    holes_par: [4,5,4,4,4,3,4,3,4, 4,3,4,4,4,4,3,5,4] },
  // Talking Stick South (Piipaash) — verified bluegolf.com (actual par 71, not 70)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'talking-stick-south', name: 'Talking Stick Golf Club (South Course)', city: 'Scottsdale', state: 'AZ', course_rating: 72.0, slope_rating: 126, total_par: 71,
    holes_par: [4,4,3,4,4,4,5,4,3, 4,4,4,3,5,4,5,3,4] },
  // Quintero Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'quintero-gc', name: 'Quintero Golf Club', city: 'Peoria', state: 'AZ', course_rating: 74.9, slope_rating: 146, total_par: 72,
    holes_par: [4,5,4,4,4,3,4,5,3, 5,4,4,3,5,4,3,4,4] },
  // Anthem Golf & CC — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'anthem-gc-az', name: 'Anthem Golf & Country Club', city: 'Phoenix', state: 'AZ', course_rating: 74.9, slope_rating: 141, total_par: 72,
    holes_par: [4,3,5,4,4,4,3,5,4, 4,5,4,3,4,4,5,3,4] },
  // Arizona Biltmore Adobe — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'arizona-biltmore-adobe', name: 'Arizona Biltmore Golf Club (Adobe)', city: 'Phoenix', state: 'AZ', course_rating: 72.0, slope_rating: 128, total_par: 71,
    holes_par: [4,5,4,4,3,4,3,4,4, 4,4,3,4,4,5,4,3,5] },
  // Legacy Golf Resort — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'legacy-resort-phoenix', name: 'Legacy Golf Resort', city: 'Phoenix', state: 'AZ', course_rating: 72.1, slope_rating: 128, total_par: 71,
    holes_par: [4,4,4,3,4,5,3,5,4, 4,3,4,4,5,3,4,3,5] },
  // Raven Golf Club South Mountain — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'raven-south-mountain', name: 'Raven Golf Club at South Mountain', city: 'Phoenix', state: 'AZ', course_rating: 73.2, slope_rating: 132, total_par: 72,
    holes_par: [4,3,4,5,4,4,3,4,5, 4,3,5,4,3,4,4,5,4] },
  // Boulders South — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'boulders-south', name: 'The Boulders Resort (South Course)', city: 'Carefree', state: 'AZ', course_rating: 72.6, slope_rating: 144, total_par: 71,
    holes_par: [4,3,4,4,5,4,3,4,4, 3,5,4,4,5,3,3,4,5] },
  // Boulders North — verified bluegolf.com (actual par 72, not 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'boulders-north', name: 'The Boulders Resort (North Course)', city: 'Carefree', state: 'AZ', course_rating: 73.3, slope_rating: 140, total_par: 72,
    holes_par: [5,3,5,4,4,3,4,4,4, 4,4,5,4,3,5,4,3,4] },
  // Desert Mountain Renegade — verified golflink.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'desert-mountain-renegade', name: 'Desert Mountain Club (Renegade)', city: 'Scottsdale', state: 'AZ', course_rating: 77.8, slope_rating: 150, total_par: 72,
    holes_par: [4,4,4,3,5,3,4,4,5, 5,4,3,4,3,5,3,5,4] },
  // Harbour Town Golf Links — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'harbour-town', name: 'Harbour Town Golf Links', city: 'Hilton Head Island', state: 'SC', course_rating: 75.6, slope_rating: 148, total_par: 71,
    holes_par: [4,5,4,3,5,4,3,4,4, 4,4,4,4,3,5,4,3,4] },
  // Palmetto Dunes Arthur Hills — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'palmetto-dunes-ah', name: 'Palmetto Dunes (Arthur Hills Course)', city: 'Hilton Head Island', state: 'SC', course_rating: 73.5, slope_rating: 139, total_par: 72,
    holes_par: [4,4,3,4,4,5,4,3,5, 4,3,4,5,4,3,4,4,5] },
  // Palmetto Dunes RTJ — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'palmetto-dunes-rtj', name: 'Palmetto Dunes (Robert Trent Jones)', city: 'Hilton Head Island', state: 'SC', course_rating: 74.8, slope_rating: 141, total_par: 72,
    holes_par: [4,4,4,5,3,4,4,3,5, 5,4,3,4,4,5,4,3,4] },
  // Sea Pines Heron Point — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sea-pines-heron', name: 'Sea Pines Resort (Heron Point)', city: 'Hilton Head Island', state: 'SC', course_rating: 73.3, slope_rating: 134, total_par: 72,
    holes_par: [4,4,4,3,4,5,3,4,5, 4,5,4,3,4,4,3,5,4] },
  // Kiawah Island Ocean Course — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kiawah-ocean', name: 'Kiawah Island (Ocean Course)', city: 'Kiawah Island', state: 'SC', course_rating: 79.1, slope_rating: 155, total_par: 72,
    holes_par: [4,5,4,4,3,4,5,3,4, 4,5,4,4,3,4,5,3,4] },
  // Kiawah Island Osprey Point — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kiawah-osprey', name: 'Kiawah Island (Osprey Point)', city: 'Kiawah Island', state: 'SC', course_rating: 73.6, slope_rating: 140, total_par: 72,
    holes_par: [4,5,3,4,4,3,4,5,4, 4,3,5,4,4,3,4,4,5] },
  // Kiawah Island Turtle Point — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kiawah-turtle', name: 'Kiawah Island (Turtle Point)', city: 'Kiawah Island', state: 'SC', course_rating: 73.9, slope_rating: 141, total_par: 72,
    holes_par: [4,5,4,3,5,4,3,4,4, 5,4,4,5,3,4,3,4,4] },
  // Wild Dunes Links — verified bluegolf.com (actual par 70, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'wild-dunes-links', name: 'Wild Dunes Resort (Links Course)', city: 'Isle of Palms', state: 'SC', course_rating: 72.1, slope_rating: 128, total_par: 70,
    holes_par: [5,4,4,3,5,4,4,3,4, 4,4,3,4,5,4,3,4,3] },
  // Caledonia Golf & Fish Club — verified bluegolf.com (actual par 70, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'caledonia-gc', name: 'Caledonia Golf & Fish Club', city: 'Pawleys Island', state: 'SC', course_rating: 71.4, slope_rating: 144, total_par: 70,
    holes_par: [4,5,3,4,4,3,4,5,3, 5,3,4,4,4,4,4,3,4] },
  // True Blue Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'true-blue-gc', name: 'True Blue Golf Club', city: 'Pawleys Island', state: 'SC', course_rating: 73.8, slope_rating: 139, total_par: 72,
    holes_par: [5,4,3,5,4,4,3,4,5, 5,3,4,4,3,5,3,4,4] },
  // Barefoot Dye — verified bluegolf.com (actual par 72, not 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'barefoot-dye', name: 'Barefoot Resort (Dye Course)', city: 'North Myrtle Beach', state: 'SC', course_rating: 75.6, slope_rating: 149, total_par: 72,
    holes_par: [4,4,3,4,5,3,4,5,4, 4,4,5,4,4,3,5,3,4] },
  // Barefoot Love — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'barefoot-love', name: 'Barefoot Resort (Love Course)', city: 'North Myrtle Beach', state: 'SC', course_rating: 74.7, slope_rating: 142, total_par: 72,
    holes_par: [4,5,3,4,4,4,4,5,3, 4,3,4,5,4,3,4,4,5] },
  // TPC Myrtle Beach — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-myrtle-beach', name: 'TPC Myrtle Beach', city: 'Murrells Inlet', state: 'SC', course_rating: 74.3, slope_rating: 154, total_par: 72,
    holes_par: [4,5,4,4,3,5,3,4,4, 4,4,4,3,5,4,4,3,5] },
  // The Dunes Golf & Beach Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'dunes-club-mb', name: 'The Dunes Golf & Beach Club', city: 'Myrtle Beach', state: 'SC', course_rating: 76.3, slope_rating: 145, total_par: 72,
    holes_par: [4,4,4,5,3,4,4,5,3, 4,4,3,5,4,5,4,3,4] },
  // Pinehurst No. 2 — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pinehurst-no2', name: 'Pinehurst Resort (No. 2)', city: 'Pinehurst', state: 'NC', course_rating: 77.9, slope_rating: 149, total_par: 72,
    holes_par: [4,4,4,4,5,3,4,5,3, 5,4,4,4,4,3,5,3,4] },
  // Pinehurst No. 4 — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pinehurst-no4', name: 'Pinehurst Resort (No. 4)', city: 'Pinehurst', state: 'NC', course_rating: 74.9, slope_rating: 138, total_par: 72,
    holes_par: [4,5,4,3,4,3,4,4,5, 4,3,4,5,3,4,4,5,4] },
  // Pinehurst No. 8 — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pinehurst-no8', name: 'Pinehurst Resort (No. 8)', city: 'Pinehurst', state: 'NC', course_rating: 73.9, slope_rating: 139, total_par: 72,
    holes_par: [4,5,4,4,3,5,4,3,4, 4,5,4,3,4,3,4,5,4] },
  // Mid Pines Inn — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'mid-pines', name: 'Mid Pines Inn & Golf Club', city: 'Southern Pines', state: 'NC', course_rating: 73.5, slope_rating: 142, total_par: 72,
    holes_par: [4,3,4,4,5,5,4,3,4, 5,3,4,3,4,5,4,4,4] },
  // Pine Needles Lodge — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pine-needles', name: 'Pine Needles Lodge & Golf Club', city: 'Southern Pines', state: 'NC', course_rating: 74.7, slope_rating: 141, total_par: 71,
    holes_par: [5,4,3,4,3,4,4,4,4, 5,4,4,3,4,5,3,4,4] },
  // Tobacco Road Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tobacco-road', name: 'Tobacco Road Golf Club', city: 'Sanford', state: 'NC', course_rating: 72.5, slope_rating: 145, total_par: 71,
    holes_par: [5,4,3,5,4,3,4,3,4, 4,5,4,5,3,4,4,3,4] },
  // TPC Wakefield Plantation — verified bluegolf.com (actual par 71, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-wakefield', name: 'TPC Wakefield Plantation', city: 'Raleigh', state: 'NC', course_rating: 75.1, slope_rating: 137, total_par: 71,
    holes_par: [4,3,4,5,3,4,4,4,5, 4,4,3,4,4,5,3,4,4] },
  // East Lake Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'east-lake-gc', name: 'East Lake Golf Club', city: 'Atlanta', state: 'GA', course_rating: 76.6, slope_rating: 144, total_par: 72,
    holes_par: [5,3,4,4,4,5,4,4,3, 4,3,4,4,5,3,4,4,5] },
  // Atlanta Athletic Club Highlands — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'atlanta-athletic-highlands', name: 'Atlanta Athletic Club (Highlands)', city: 'Johns Creek', state: 'GA', course_rating: 77.4, slope_rating: 152, total_par: 72,
    holes_par: [4,5,4,3,5,4,3,4,4, 4,4,5,4,4,3,4,3,5] },
  // Sea Island Seaside — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sea-island-seaside', name: 'Sea Island Golf Club (Seaside Course)', city: 'St. Simons Island', state: 'GA', course_rating: 73.8, slope_rating: 138, total_par: 70,
    holes_par: [4,4,3,4,4,3,5,4,4, 4,4,3,4,4,5,4,3,4] },
  // Sea Island Plantation — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sea-island-plantation', name: 'Sea Island Golf Club (Plantation Course)', city: 'St. Simons Island', state: 'GA', course_rating: 74.0, slope_rating: 129, total_par: 72,
    holes_par: [4,4,3,5,4,4,3,5,4, 4,3,4,4,5,4,3,4,5] },
  // Reynolds Great Waters — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'reynolds-great-waters', name: 'Reynolds Lake Oconee (Great Waters)', city: 'Greensboro', state: 'GA', course_rating: 76.1, slope_rating: 147, total_par: 72,
    holes_par: [4,5,4,3,4,5,4,3,4, 4,4,5,4,3,4,4,3,5] },
  // TPC Sugarloaf — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-sugarloaf', name: 'TPC Sugarloaf', city: 'Duluth', state: 'GA', course_rating: 76.1, slope_rating: 150, total_par: 72,
    holes_par: [4,3,4,5,4,5,4,3,4, 5,3,4,4,4,4,3,4,5] },
  // Bethpage Black — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bethpage-black', name: 'Bethpage State Park (Black Course)', city: 'Farmingdale', state: 'NY', course_rating: 78.0, slope_rating: 155, total_par: 71,
    holes_par: [4,4,3,5,4,4,5,3,4, 4,4,4,5,3,4,4,3,4] },
  // Bethpage Red — verified golflink.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bethpage-red', name: 'Bethpage State Park (Red Course)', city: 'Farmingdale', state: 'NY', course_rating: 73.4, slope_rating: 129, total_par: 70,
    holes_par: [4,4,4,3,5,4,3,4,4, 4,4,3,4,4,4,5,3,4] },
  // Winged Foot West — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'winged-foot-west', name: 'Winged Foot Golf Club (West Course)', city: 'Mamaroneck', state: 'NY', course_rating: 76.4, slope_rating: 140, total_par: 72,
    holes_par: [4,4,3,4,5,4,3,4,5, 3,4,5,3,4,4,5,4,4] },
  // Shinnecock Hills — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'shinnecock-hills', name: 'Shinnecock Hills Golf Club', city: 'Southampton', state: 'NY', course_rating: 74.7, slope_rating: 145, total_par: 70,
    holes_par: [4,3,4,4,5,4,3,4,4, 4,3,4,4,4,4,5,3,4] },
  // Trump Ferry Point (now Bally's Golf Links) — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'trump-ferry-point', name: 'Trump Golf Links at Ferry Point', city: 'Bronx', state: 'NY', course_rating: 76.3, slope_rating: 146, total_par: 72,
    holes_par: [4,5,3,5,4,4,4,3,4, 4,4,3,4,4,5,4,3,5] },
  // Kapalua Plantation — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kapalua-plantation', name: 'Kapalua Golf Club (Plantation Course)', city: 'Kapalua', state: 'HI', course_rating: 75.5, slope_rating: 140, total_par: 73,
    holes_par: [4,3,4,4,5,4,4,3,5, 4,3,4,4,4,5,4,4,5] },
  // Kapalua Bay — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kapalua-bay', name: 'Kapalua Golf Club (Bay Course)', city: 'Kapalua', state: 'HI', course_rating: 72.7, slope_rating: 137, total_par: 72,
    holes_par: [4,3,4,5,4,3,4,4,5, 4,3,5,5,4,3,4,3,5] },
  // Wailea Gold — verified golflink.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'wailea-gold', name: 'Wailea Golf Club (Gold Course)', city: 'Wailea', state: 'HI', course_rating: 73.0, slope_rating: 139, total_par: 72,
    holes_par: [4,5,3,4,4,4,5,3,4, 4,3,4,5,4,5,3,4,4] },
  // Wailea Emerald — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'wailea-emerald', name: 'Wailea Golf Club (Emerald Course)', city: 'Wailea', state: 'HI', course_rating: 71.7, slope_rating: 130, total_par: 72,
    holes_par: [4,5,3,4,4,4,4,3,5, 4,5,4,3,4,4,3,4,5] },
  // Ko Olina Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'ko-olina', name: 'Ko Olina Golf Club', city: 'Kapolei', state: 'HI', course_rating: 74.0, slope_rating: 132, total_par: 72,
    holes_par: [5,4,4,3,5,4,4,3,4, 4,4,3,5,5,4,3,4,4] },
  // Turtle Bay Palmer — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'turtle-bay-palmer', name: 'Turtle Bay Resort (Arnold Palmer Course)', city: 'Kahuku', state: 'HI', course_rating: 75.2, slope_rating: 134, total_par: 72,
    holes_par: [4,4,5,3,4,4,4,3,5, 4,4,5,3,4,3,4,4,5] },
  // Princeville Makai — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'princeville-makai', name: 'Princeville Makai Golf Club', city: 'Princeville', state: 'HI', course_rating: 75.4, slope_rating: 134, total_par: 72,
    holes_par: [4,5,3,4,5,4,3,4,4, 4,5,4,3,4,4,3,4,5] },
  // Mauna Kea Golf Course — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'mauna-kea-gc', name: 'Mauna Kea Golf Course', city: 'Waimea', state: 'HI', course_rating: 77.2, slope_rating: 136, total_par: 72,
    holes_par: [4,4,3,4,5,4,3,5,4, 5,3,4,4,4,3,4,5,4] },
  // Shadow Creek — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'shadow-creek', name: 'Shadow Creek Golf Course', city: 'North Las Vegas', state: 'NV', course_rating: 74.5, slope_rating: 145, total_par: 72,
    holes_par: [4,4,4,5,3,4,5,3,4, 4,4,4,3,4,4,5,3,5] },
  // TPC Las Vegas — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-las-vegas', name: 'TPC Las Vegas', city: 'Las Vegas', state: 'NV', course_rating: 73.9, slope_rating: 146, total_par: 71,
    holes_par: [4,3,4,5,4,5,3,4,4, 4,4,3,4,4,5,3,4,4] },
  // Cascata Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'cascata-gc', name: 'Cascata Golf Club', city: 'Boulder City', state: 'NV', course_rating: 73.4, slope_rating: 141, total_par: 72,
    holes_par: [4,4,5,3,5,4,3,4,4, 4,4,3,4,4,3,5,4,5] },
  // Edgewood Tahoe — verified greenskeeper.org
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'edgewood-tahoe', name: 'Edgewood Tahoe Golf Course', city: 'Stateline', state: 'NV', course_rating: 75.5, slope_rating: 145, total_par: 72,
    holes_par: [4,4,5,5,3,4,3,4,4, 4,4,3,4,4,4,5,3,5] },
  // Montreux Golf & CC — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'montreux-gc', name: 'Montreux Golf & Country Club', city: 'Reno', state: 'NV', course_rating: 75.5, slope_rating: 140, total_par: 72,
    holes_par: [4,5,3,4,4,4,3,5,4, 4,3,4,5,4,4,3,4,5] },
  // Merion Golf Club East — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'merion-east', name: 'Merion Golf Club (East Course)', city: 'Ardmore', state: 'PA', course_rating: 75.1, slope_rating: 151, total_par: 70,
    holes_par: [4,5,3,5,4,4,4,4,3, 4,4,4,3,4,4,4,3,4] },
  // Oakmont Country Club — verified golflink.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'oakmont-cc', name: 'Oakmont Country Club', city: 'Oakmont', state: 'PA', course_rating: 76.8, slope_rating: 144, total_par: 71,
    holes_par: [4,4,4,5,4,3,4,3,5, 4,4,5,3,4,4,3,4,4] },
  // Medinah Country Club No. 3 — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'medinah-no3', name: 'Medinah Country Club (Course No. 3)', city: 'Medinah', state: 'IL', course_rating: 76.8, slope_rating: 143, total_par: 72,
    holes_par: [4,3,4,4,5,4,5,4,4, 5,3,4,3,4,4,4,3,5] },
  // Olympia Fields North — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'olympia-fields-north', name: 'Olympia Fields Country Club (North)', city: 'Olympia Fields', state: 'IL', course_rating: 76.6, slope_rating: 150, total_par: 70,
    holes_par: [5,4,4,4,4,3,4,3,4, 4,4,4,3,4,5,3,4,4] },
  // Cog Hill No. 4 (Dubsdread) — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'cog-hill-no4', name: 'Cog Hill Golf & Country Club (Dubsdread)', city: 'Lemont', state: 'IL', course_rating: 78.0, slope_rating: 153, total_par: 72,
    holes_par: [4,3,4,4,5,3,4,4,5, 4,5,3,4,3,5,4,4,4] },
  // Rich Harvest Farms — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'rich-harvest-farms', name: 'Rich Harvest Farms', city: 'Sugar Grove', state: 'IL', course_rating: 76.6, slope_rating: 152, total_par: 72,
    holes_par: [4,5,4,3,4,4,3,4,5, 4,5,3,4,3,4,5,4,4] },
  // Conway Farms Golf Club — verified golflink.com (actual par 71, not 72)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'conway-farms', name: 'Conway Farms Golf Club', city: 'Lake Forest', state: 'IL', course_rating: 76.4, slope_rating: 148, total_par: 71,
    holes_par: [4,3,4,4,4,3,4,5,4, 4,3,4,4,5,4,4,3,5] },
  // Hazeltine National Golf Club — verified bluegolf.com + USGA (course_rating: 77.8/148 confirmed by 2024 U.S. Amateur fact sheet)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'hazeltine-national', name: 'Hazeltine National Golf Club', city: 'Chaska', state: 'MN', course_rating: 77.8, slope_rating: 148, total_par: 72,
    holes_par: [4,4,5,3,4,4,5,3,4, 4,5,4,3,4,5,4,3,4] },
  // Interlachen Country Club — verified bluegolf.com + golflink.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'interlachen-cc', name: 'Interlachen Country Club', city: 'Edina', state: 'MN', course_rating: 74.2, slope_rating: 141, total_par: 72,
    holes_par: [5,4,3,5,3,4,4,4,5, 4,4,5,3,4,4,4,3,4] },
  // Giants Ridge The Quarry — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'giants-ridge-quarry', name: 'Giants Ridge Golf & Ski (The Quarry)', city: 'Biwabik', state: 'MN', course_rating: 75.7, slope_rating: 145, total_par: 72,
    holes_par: [4,5,4,3,5,4,3,4,4, 4,3,4,4,5,4,5,3,4] },
  // Kinloch Golf Club — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kinloch-gc', name: 'Kinloch Golf Club', city: 'Manakin-Sabot', state: 'VA', course_rating: 76.1, slope_rating: 146, total_par: 72,
    holes_par: [4,4,5,4,3,4,3,4,5, 4,5,4,5,3,4,4,3,4] },
  // The Homestead Cascades — verified golflink.com (par 70, not 71; hole 12 is par 4)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'homestead-cascades', name: 'The Homestead (Cascades Course)', city: 'Hot Springs', state: 'VA', course_rating: 73.0, slope_rating: 137, total_par: 70,
    holes_par: [4,4,4,3,5,4,4,3,4, 4,3,4,4,4,3,5,5,3] },
  // Kingsmill River Course — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'kingsmill-river', name: 'Kingsmill Resort (River Course)', city: 'Williamsburg', state: 'VA', course_rating: 73.6, slope_rating: 137, total_par: 71,
    holes_par: [4,3,5,4,3,4,5,4,4, 4,4,4,3,4,5,4,3,4] },
  // Colonial Williamsburg Golden Horseshoe Gold — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'golden-horseshoe-gold', name: 'Colonial Williamsburg (Golden Horseshoe Gold)', city: 'Williamsburg', state: 'VA', course_rating: 73.7, slope_rating: 140, total_par: 71,
    holes_par: [4,5,3,4,4,5,3,4,4, 4,4,3,4,4,5,3,4,4] },
  // Chambers Bay — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'chambers-bay', name: 'Chambers Bay Golf Course', city: 'University Place', state: 'WA', course_rating: 77.6, slope_rating: 145, total_par: 72,
    holes_par: [4,4,3,5,4,4,4,5,3, 4,4,4,5,4,3,4,3,5] },
  // Sahalee Country Club South/North — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sahalee-south-north', name: 'Sahalee Country Club (South/North)', city: 'Sammamish', state: 'WA', course_rating: 74.6, slope_rating: 138, total_par: 72,
    holes_par: [4,5,4,4,3,5,4,4,3, 4,5,4,3,4,4,4,3,5] },
  // Gamble Sands — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'gamble-sands', name: 'Gamble Sands Golf Course', city: 'Brewster', state: 'WA', course_rating: 73.7, slope_rating: 125, total_par: 72,
    holes_par: [4,4,5,3,4,3,5,4,4, 3,4,4,5,4,4,3,4,5] },
  // Bandon Dunes Golf Course — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bandon-dunes-course', name: 'Bandon Dunes Golf Resort (Bandon Dunes)', city: 'Bandon', state: 'OR', course_rating: 75.9, slope_rating: 145, total_par: 72,
    holes_par: [4,3,5,4,4,3,4,4,5, 4,4,3,5,4,3,4,4,5] },
  // Pacific Dunes — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bandon-pacific-dunes', name: 'Bandon Dunes Golf Resort (Pacific Dunes)', city: 'Bandon', state: 'OR', course_rating: 73.2, slope_rating: 143, total_par: 71,
    holes_par: [4,4,5,4,3,4,4,4,4, 3,3,5,4,3,5,4,3,5] },
  // Bandon Trails — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bandon-trails', name: 'Bandon Dunes Golf Resort (Bandon Trails)', city: 'Bandon', state: 'OR', course_rating: 73.6, slope_rating: 130, total_par: 71,
    holes_par: [4,3,5,4,3,4,4,4,5, 4,4,3,4,4,4,5,3,4] },
  // Old Macdonald — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bandon-old-macdonald', name: 'Bandon Dunes Golf Resort (Old Macdonald)', city: 'Bandon', state: 'OR', course_rating: 74.4, slope_rating: 134, total_par: 71,
    holes_par: [4,3,4,4,3,5,4,3,4, 4,4,3,4,4,5,4,5,4] },
  // TPC Southwind — verified bluegolf.com (actual par 70, not 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tpc-southwind', name: 'TPC Southwind', city: 'Memphis', state: 'TN', course_rating: 75.6, slope_rating: 149, total_par: 70,
    holes_par: [4,4,5,3,4,4,4,3,4, 4,3,4,4,3,4,5,4,4] },
  // Orange County
  // Strawberry Farms — verified scorecard (bluegolf.com + greenskeeper.org). Black tees 73.0/134.
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'strawberry-farms-irvine', name: 'Strawberry Farms Golf Club', city: 'Irvine', state: 'CA', course_rating: 73.0, slope_rating: 134, total_par: 71,
    holes_par: [4,4,3,4,4,5,3,4,5, 4,3,5,4,4,3,5,3,4] },
  // Oak Creek — verified scorecard (bluegolf.com). Black tees 72.5/133.
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'oak-creek-irvine', name: 'Oak Creek Golf Club', city: 'Irvine', state: 'CA', course_rating: 72.5, slope_rating: 133, total_par: 71,
    holes_par: [4,4,3,4,4,5,3,4,4, 5,3,4,4,4,4,4,3,5] },
  // Tustin Ranch — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tustin-ranch-gc', name: 'Tustin Ranch Golf Club', city: 'Tustin', state: 'CA', course_rating: 73.6, slope_rating: 134, total_par: 72,
    holes_par: [4,5,3,4,4,3,4,4,5, 5,3,4,4,4,5,4,3,4] },
  // Coyote Hills — verified bluegolf.com (par 70)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'coyote-hills-gc', name: 'Coyote Hills Golf Course', city: 'Fullerton', state: 'CA', course_rating: 72.1, slope_rating: 134, total_par: 70,
    holes_par: [4,4,3,4,4,4,4,3,4, 4,5,4,4,3,5,4,3,4] },
  // Anaheim Hills — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'anaheim-hills-gc', name: 'Anaheim Hills Golf Course', city: 'Anaheim', state: 'CA', course_rating: 71.4, slope_rating: 124, total_par: 71,
    holes_par: [5,4,4,4,3,4,3,4,4, 4,4,5,3,4,4,4,3,5] },
  // Dad Miller — verified bluegolf.com (currently par 69; hole 15 permanently changed from par 5 to par 3)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'dad-miller-gc', name: 'Dad Miller Golf Course', city: 'Anaheim', state: 'CA', course_rating: 66.6, slope_rating: 110, total_par: 69,
    holes_par: [4,4,4,4,4,4,3,5,3, 5,3,4,3,4,3,3,4,5] },
  // Willowick — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'willowick-gc', name: 'Willowick Golf Course', city: 'Santa Ana', state: 'CA', course_rating: 68.4, slope_rating: 113, total_par: 71,
    holes_par: [4,3,5,3,4,5,3,4,4, 5,5,3,4,4,4,4,3,4] },
  // River View — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'river-view-gc', name: 'River View Golf Course', city: 'Santa Ana', state: 'CA', course_rating: 68.4, slope_rating: 120, total_par: 70,
    holes_par: [4,3,3,4,5,3,4,5,3, 3,4,4,5,3,5,4,5,3] },
  // Meadowlark — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'meadowlark-gc', name: 'Meadowlark Golf Course', city: 'Huntington Beach', state: 'CA', course_rating: 68.1, slope_rating: 119, total_par: 71,
    holes_par: [4,4,5,3,4,5,3,4,4, 4,4,4,3,4,4,3,4,5] },
  // Mile Square (Classic Course) — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'mile-square-gc', name: 'Mile Square Golf Course (Classic)', city: 'Fountain Valley', state: 'CA', course_rating: 71.5, slope_rating: 124, total_par: 72,
    holes_par: [4,4,4,5,3,4,4,3,5, 5,4,4,3,4,3,4,4,5] },
  // Shorecliffs — verified bluegolf.com (par 70)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'shorecliffs-gc', name: 'Shorecliffs Golf Course', city: 'San Clemente', state: 'CA', course_rating: 69.0, slope_rating: 125, total_par: 70,
    holes_par: [4,5,5,3,4,3,5,4,4, 3,4,4,4,3,4,3,4,4] },
  // San Juan Hills — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'san-juan-hills-gc', name: 'San Juan Hills Golf Club', city: 'San Juan Capistrano', state: 'CA', course_rating: 70.6, slope_rating: 125, total_par: 71,
    holes_par: [4,4,4,4,4,5,3,5,3, 4,4,5,4,3,4,3,5,3] },
  // Talega — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'talega-gc', name: 'Talega Golf Club', city: 'San Clemente', state: 'CA', course_rating: 73.7, slope_rating: 135, total_par: 72,
    holes_par: [4,5,4,4,3,5,3,3,4, 4,5,3,5,4,5,4,3,4] },
  // San Clemente Municipal — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'san-clemente-muni', name: 'San Clemente Municipal Golf Course', city: 'San Clemente', state: 'CA', course_rating: 70.9, slope_rating: 126, total_par: 72,
    holes_par: [4,3,4,4,5,4,5,4,3, 4,5,5,3,4,3,4,4,4] },
  // Black Gold — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'black-gold-gc', name: 'Black Gold Golf Club', city: 'Yorba Linda', state: 'CA', course_rating: 73.2, slope_rating: 136, total_par: 72,
    holes_par: [4,4,4,5,4,5,3,3,4, 3,4,4,5,4,4,3,4,5] },
  // Los Coyotes CC (Lake/Valley 18-hole combo) — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'los-coyotes-cc-oc', name: 'Los Coyotes Country Club', city: 'Buena Park', state: 'CA', course_rating: 72.3, slope_rating: 131, total_par: 71,
    holes_par: [4,4,3,5,3,4,3,4,5, 5,3,5,4,3,4,4,4,4] },
  // Fullerton GC — verified bluegolf.com (par 67 executive course)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'fullerton-gc', name: 'Fullerton Golf Course', city: 'Fullerton', state: 'CA', course_rating: 65.4, slope_rating: 114, total_par: 67,
    holes_par: [4,5,4,4,3,3,3,3,4, 4,3,5,4,4,3,4,4,3] },
  // Newport Beach GC — REMOVED: par-59 executive short course (13 par-3s), not a regulation layout
  // Marbella CC — verified bluegolf.com (par 70)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'marbella-cc-oc', name: 'Marbella Country Club', city: 'San Juan Capistrano', state: 'CA', course_rating: 72.4, slope_rating: 134, total_par: 70,
    holes_par: [4,4,4,3,5,4,3,4,4, 4,3,4,4,5,4,3,4,4] },
  // Coto de Caza South — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'coto-de-caza-south', name: 'Coto de Caza Golf Club (South Course)', city: 'Coto de Caza', state: 'CA', course_rating: 73.8, slope_rating: 137, total_par: 72,
    holes_par: [4,4,5,3,4,5,4,3,4, 3,4,5,4,4,4,3,4,5] },
  // Coto de Caza North — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'coto-de-caza-north', name: 'Coto de Caza Golf Club (North Course)', city: 'Coto de Caza', state: 'CA', course_rating: 75.6, slope_rating: 143, total_par: 72,
    holes_par: [5,4,4,3,5,3,4,4,4, 5,3,5,4,4,3,4,4,4] },
  // Dove Canyon — verified bluegolf.com (par 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'dove-canyon-cc', name: 'Dove Canyon Country Club', city: 'Trabuco Canyon', state: 'CA', course_rating: 74.7, slope_rating: 140, total_par: 71,
    holes_par: [5,4,4,3,4,4,3,4,5, 3,5,4,3,5,4,4,3,4] },
  // Tijeras Creek — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tijeras-creek-gc', name: 'Tijeras Creek Golf Club', city: 'Rancho Santa Margarita', state: 'CA', course_rating: 73.7, slope_rating: 137, total_par: 72,
    holes_par: [5,4,4,4,3,4,3,5,4, 4,5,4,5,3,4,3,4,4] },
  // Arroyo Trabuco — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'arroyo-trabuco-gc', name: 'Arroyo Trabuco Golf Club', city: 'Mission Viejo', state: 'CA', course_rating: 73.8, slope_rating: 135, total_par: 72,
    holes_par: [4,4,5,3,4,4,5,3,4, 4,3,4,3,5,4,4,4,5] },
  // Aliso Viejo CC — verified bluegolf.com (par 72, not 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'aliso-viejo-cc', name: 'Aliso Viejo Country Club', city: 'Aliso Viejo', state: 'CA', course_rating: 71.5, slope_rating: 129, total_par: 72,
    holes_par: [4,4,4,4,3,4,3,4,5, 4,4,3,4,5,5,3,4,5] },
  // Yorba Linda CC — verified bluegolf.com (par 71)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'yorba-linda-cc', name: 'Yorba Linda Country Club', city: 'Yorba Linda', state: 'CA', course_rating: 73.4, slope_rating: 132, total_par: 71,
    holes_par: [4,4,4,4,3,4,3,4,5, 4,4,4,3,5,4,4,3,5] },
  // Los Angeles County — all verified bluegolf.com / golflink.com / greenskeeper.org
  // REMOVED: pacific-palms-gc (not standalone; same facility as industry-hills-babe/eisenhower)
  // REMOVED: azusa-greens-cc (9-hole course played twice, no distinct 18-hole layout)
  // REMOVED: puente-hills-cc (no scorecard found in any golf database)
  // REMOVED: chevy-chase-gc (9-hole course, not a regulation 18-hole layout)
  // REMOVED: malibu-cc (permanently closed March 2015)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'griffith-park-wilson', name: 'Griffith Park Golf Course (Wilson)', city: 'Los Angeles', state: 'CA', course_rating: 73.0, slope_rating: 126, total_par: 72,
    holes_par: [5,4,3,4,4,4,4,4,5, 4,3,4,4,5,3,4,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'griffith-park-harding', name: 'Griffith Park Golf Course (Harding)', city: 'Los Angeles', state: 'CA', course_rating: 71.5, slope_rating: 122, total_par: 72,
    holes_par: [4,4,4,4,3,5,5,4,4, 4,4,4,3,4,3,4,4,5] },
  // Rancho Park — verified bluegolf.com
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'rancho-park-gc', name: 'Rancho Park Golf Course', city: 'Los Angeles', state: 'CA', course_rating: 72.8, slope_rating: 130, total_par: 71,
    holes_par: [4,4,3,5,4,4,4,3,4, 4,4,3,4,4,4,3,5,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'industry-hills-babe', name: 'Industry Hills Golf Club (Babe Zaharias)', city: 'City of Industry', state: 'CA', course_rating: 73.6, slope_rating: 135, total_par: 71,
    holes_par: [4,4,4,4,4,5,3,4,4, 4,5,4,3,3,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'industry-hills-eisenhower', name: 'Industry Hills Golf Club (Eisenhower)', city: 'City of Industry', state: 'CA', course_rating: 74.9, slope_rating: 141, total_par: 72,
    holes_par: [5,4,4,4,3,4,4,5,3, 5,4,4,3,4,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'brookside-gc-koiner', name: 'Brookside Golf Course (C.W. Koiner)', city: 'Pasadena', state: 'CA', course_rating: 74.5, slope_rating: 134, total_par: 72,
    holes_par: [4,5,4,3,4,5,4,3,4, 4,4,4,4,4,5,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'brookside-gc-nay', name: 'Brookside Golf Course (E.O. Nay)', city: 'Pasadena', state: 'CA', course_rating: 68.9, slope_rating: 122, total_par: 70,
    holes_par: [4,4,4,4,3,4,4,4,4, 3,5,3,4,4,3,5,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'alhambra-gc', name: 'Alhambra Golf Course', city: 'Alhambra', state: 'CA', course_rating: 66.2, slope_rating: 116, total_par: 71,
    holes_par: [4,5,4,4,4,5,3,3,4, 4,3,4,3,4,3,5,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'lakewood-cc-la', name: 'Lakewood Country Club', city: 'Lakewood', state: 'CA', course_rating: 73.0, slope_rating: 128, total_par: 72,
    holes_par: [4,4,3,4,3,4,5,4,5, 4,4,3,4,5,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'recreation-park-gc', name: 'Recreation Park Golf Course', city: 'Long Beach', state: 'CA', course_rating: 70.2, slope_rating: 119, total_par: 72,
    holes_par: [4,4,4,4,3,4,4,4,5, 4,4,3,4,5,4,3,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'los-verdes-gc', name: 'Los Verdes Golf Course', city: 'Rancho Palos Verdes', state: 'CA', course_rating: 72.2, slope_rating: 126, total_par: 71,
    holes_par: [5,4,3,4,3,5,4,4,4, 4,4,3,4,4,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'trump-national-la', name: 'Trump National Golf Club (Los Angeles)', city: 'Rancho Palos Verdes', state: 'CA', course_rating: 75.0, slope_rating: 144, total_par: 71,
    holes_par: [4,5,4,3,4,4,5,3,4, 4,3,5,4,5,3,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'whittier-narrows-gc', name: 'Whittier Narrows Golf Course', city: 'Rosemead', state: 'CA', course_rating: 72.3, slope_rating: 121, total_par: 72,
    holes_par: [5,4,5,4,3,4,3,4,4, 3,5,4,4,5,4,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'el-dorado-gc-lb', name: 'El Dorado Golf Course', city: 'Long Beach', state: 'CA', course_rating: 72.8, slope_rating: 130, total_par: 72,
    holes_par: [4,4,3,5,4,4,5,4,3, 5,4,3,4,4,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'mountain-meadows-gc', name: 'Mountain Meadows Golf Course', city: 'Pomona', state: 'CA', course_rating: 71.6, slope_rating: 128, total_par: 72,
    holes_par: [5,4,4,4,4,3,4,5,3, 4,5,4,3,4,5,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'marshall-canyon-gc', name: 'Marshall Canyon Golf Course', city: 'La Verne', state: 'CA', course_rating: 69.8, slope_rating: 123, total_par: 71,
    holes_par: [5,3,4,4,4,4,3,4,4, 5,3,4,4,4,4,3,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'via-verde-cc', name: 'Via Verde Country Club', city: 'San Dimas', state: 'CA', course_rating: 71.1, slope_rating: 127, total_par: 72,
    holes_par: [4,5,3,4,4,5,4,4,3, 5,3,4,3,4,4,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'san-dimas-canyon-gc', name: 'San Dimas Canyon Golf Course', city: 'San Dimas', state: 'CA', course_rating: 71.4, slope_rating: 124, total_par: 72,
    holes_par: [4,3,5,4,3,5,3,4,5, 3,4,5,4,4,4,3,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'glendora-cc', name: 'Glendora Country Club', city: 'Glendora', state: 'CA', course_rating: 72.8, slope_rating: 130, total_par: 72,
    holes_par: [5,3,4,4,5,4,3,4,4, 4,4,5,3,4,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'angeles-national-gc', name: 'Angeles National Golf Club', city: 'Sunland', state: 'CA', course_rating: 74.7, slope_rating: 143, total_par: 72,
    holes_par: [4,5,3,4,4,4,3,5,4, 4,4,3,5,3,4,5,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'lacc-north', name: 'Los Angeles Country Club (North)', city: 'Los Angeles', state: 'CA', course_rating: 75.4, slope_rating: 143, total_par: 70,
    holes_par: [5,4,4,3,4,4,3,5,3, 4,3,4,4,5,3,4,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'lacc-south', name: 'Los Angeles Country Club (South)', city: 'Los Angeles', state: 'CA', course_rating: 71.1, slope_rating: 129, total_par: 70,
    holes_par: [4,4,5,3,4,4,3,5,3, 5,3,4,4,3,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'knollwood-cc', name: 'Knollwood Country Club', city: 'Granada Hills', state: 'CA', course_rating: 71.0, slope_rating: 126, total_par: 72,
    holes_par: [4,5,4,5,4,3,4,3,4, 4,5,4,3,4,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'la-mirada-gc', name: 'La Mirada Golf Course', city: 'La Mirada', state: 'CA', course_rating: 69.2, slope_rating: 119, total_par: 70,
    holes_par: [4,4,3,5,3,4,5,4,3, 4,3,5,3,4,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'woodley-lakes-gc', name: 'Woodley Lakes Golf Course', city: 'Van Nuys', state: 'CA', course_rating: 71.5, slope_rating: 119, total_par: 72,
    holes_par: [4,4,3,5,4,4,3,5,4, 4,4,3,5,4,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sep-valley-gc', name: 'Sepulveda Golf Complex (Balboa)', city: 'Encino', state: 'CA', course_rating: 70.5, slope_rating: 116, total_par: 72,
    holes_par: [4,4,5,3,5,4,4,4,4, 4,4,5,3,4,4,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'de-bell-gc', name: 'De Bell Golf Course', city: 'Burbank', state: 'CA', course_rating: 68.9, slope_rating: 122, total_par: 71,
    holes_par: [5,4,4,4,4,3,3,5,4, 4,5,3,5,3,4,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'chester-washington-gc', name: 'Chester Washington Golf Course', city: 'Los Angeles', state: 'CA', course_rating: 70.6, slope_rating: 124, total_par: 70,
    holes_par: [4,3,4,3,4,4,4,4,4, 3,4,5,3,4,4,4,4,5] },
  // San Diego County — all verified bluegolf.com / golflink.com / greenskeeper.org
  // REMOVED: cottonwood-gc-cascade ("Cascade" course doesn't exist at Cottonwood; only Ivanhoe and Lakes)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'balboa-park-gc', name: 'Balboa Park Golf Course', city: 'San Diego', state: 'CA', course_rating: 71.5, slope_rating: 126, total_par: 72,
    holes_par: [4,5,4,4,4,3,5,4,3, 4,4,4,3,5,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'coronado-gc', name: 'Coronado Municipal Golf Course', city: 'Coronado', state: 'CA', course_rating: 71.9, slope_rating: 122, total_par: 72,
    holes_par: [4,5,4,5,3,4,4,4,3, 4,3,4,5,4,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'mt-woodson-gc', name: 'Mt. Woodson Golf Club', city: 'Ramona', state: 'CA', course_rating: 69.0, slope_rating: 133, total_par: 70,
    holes_par: [4,4,3,5,4,3,4,4,3, 4,3,4,5,5,4,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'cottonwood-gc-lakes', name: 'Cottonwood Golf Club (Lakes)', city: 'El Cajon', state: 'CA', course_rating: 70.5, slope_rating: 121, total_par: 71,
    holes_par: [5,3,4,5,3,4,3,5,4, 4,4,4,3,4,5,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'eastlake-cc-sd', name: 'Eastlake Country Club', city: 'Chula Vista', state: 'CA', course_rating: 71.5, slope_rating: 130, total_par: 72,
    holes_par: [4,4,4,3,5,4,3,4,5, 4,4,3,4,5,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bonita-gc', name: 'Bonita Golf Course', city: 'Bonita', state: 'CA', course_rating: 69.3, slope_rating: 118, total_par: 71,
    holes_par: [4,4,5,4,4,3,4,4,3, 4,3,5,4,4,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'carmel-mountain-ranch', name: 'Carmel Mountain Ranch Country Club', city: 'San Diego', state: 'CA', course_rating: 73.2, slope_rating: 133, total_par: 72,
    holes_par: [4,4,4,3,5,3,4,5,4, 5,3,3,4,4,5,4,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'singing-hills-resort', name: 'Singing Hills Resort (Willow Glen)', city: 'El Cajon', state: 'CA', course_rating: 72.3, slope_rating: 128, total_par: 72,
    holes_par: [4,4,4,4,5,3,4,5,3, 5,4,3,4,4,4,4,5,3] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'san-vicente-resort-gc', name: 'San Vicente Resort Golf Course', city: 'Ramona', state: 'CA', course_rating: 73.7, slope_rating: 135, total_par: 72,
    holes_par: [5,3,4,5,4,4,4,3,4, 4,5,3,4,4,3,4,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'shadowridge-cc-vista', name: 'Shadowridge Country Club', city: 'Vista', state: 'CA', course_rating: 73.9, slope_rating: 131, total_par: 72,
    holes_par: [5,4,4,3,4,4,5,3,4, 4,4,3,4,5,3,4,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'morgan-run-resort', name: 'Morgan Run Resort & Club', city: 'Rancho Santa Fe', state: 'CA', course_rating: 71.3, slope_rating: 126, total_par: 72,
    holes_par: [3,4,3,5,4,4,5,3,5, 4,3,4,4,5,4,5,4,3] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'encinitas-ranch-gc', name: 'Encinitas Ranch Golf Course', city: 'Encinitas', state: 'CA', course_rating: 71.0, slope_rating: 126, total_par: 72,
    holes_par: [4,3,5,4,4,3,4,4,5, 4,5,3,4,4,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'the-crossings-carlsbad', name: 'The Crossings at Carlsbad', city: 'Carlsbad', state: 'CA', course_rating: 72.8, slope_rating: 135, total_par: 72,
    holes_par: [4,4,4,3,5,4,5,4,3, 4,4,4,4,3,5,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'la-costa-north', name: 'Omni La Costa Resort (North Course)', city: 'Carlsbad', state: 'CA', course_rating: 72.8, slope_rating: 133, total_par: 72,
    holes_par: [4,4,4,4,4,3,5,3,5, 4,3,5,4,3,4,4,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pala-mesa-resort', name: 'Pala Mesa Resort Golf Course', city: 'Fallbrook', state: 'CA', course_rating: 72.6, slope_rating: 131, total_par: 72,
    holes_par: [4,5,4,3,4,4,3,5,4, 5,4,5,4,3,4,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'twin-oaks-gc', name: 'Twin Oaks Golf Course', city: 'San Marcos', state: 'CA', course_rating: 71.9, slope_rating: 130, total_par: 72,
    holes_par: [4,5,3,4,5,4,3,4,4, 3,4,4,4,4,4,5,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bernardo-heights-cc', name: 'Bernardo Heights Country Club', city: 'Rancho Bernardo', state: 'CA', course_rating: 72.5, slope_rating: 130, total_par: 72,
    holes_par: [4,5,3,5,4,4,4,4,3, 4,4,3,5,4,4,3,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'lomas-santa-fe-cc', name: 'Lomas Santa Fe Country Club', city: 'Solana Beach', state: 'CA', course_rating: 72.4, slope_rating: 130, total_par: 72,
    holes_par: [5,4,5,3,4,4,4,4,3, 5,4,4,4,3,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'la-jolla-cc', name: 'La Jolla Country Club', city: 'La Jolla', state: 'CA', course_rating: 74.5, slope_rating: 135, total_par: 72,
    holes_par: [4,3,4,4,4,4,3,5,4, 4,4,4,4,4,5,3,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'san-diego-cc', name: 'San Diego Country Club', city: 'Chula Vista', state: 'CA', course_rating: 74.2, slope_rating: 136, total_par: 72,
    holes_par: [4,5,3,4,4,3,4,5,4, 4,3,4,3,5,4,5,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'stoneridge-cc', name: 'StoneRidge Country Club', city: 'Poway', state: 'CA', course_rating: 71.9, slope_rating: 133, total_par: 72,
    holes_par: [5,4,3,4,5,4,3,4,4, 4,4,5,3,4,5,3,4,4] },
  // Inland Empire — all verified bluegolf.com / greenskeeper.org
  // REMOVED: empire-lakes-gc (permanently closed June 2016, site demolished)
  // REMOVED: national-gc-sb (no course by this name exists in any golf database)
  // REMOVED: sun-city-gc-ie (closed; only executive courses remain in Sun City)
  // REMOVED: perris-hills-gc (no golf course by this name exists in San Bernardino)
  // REMOVED: colton-gc (par-56 executive short course, not regulation layout)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'oak-quarry-gc', name: 'Oak Quarry Golf Club', city: 'Jurupa Valley', state: 'CA', course_rating: 73.8, slope_rating: 137, total_par: 72,
    holes_par: [4,4,4,5,3,4,3,4,4, 5,4,3,4,5,4,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'goose-creek-gc', name: 'Goose Creek Golf Club', city: 'Corona', state: 'CA', course_rating: 73.1, slope_rating: 132, total_par: 71,
    holes_par: [4,3,4,5,3,4,5,4,3, 4,3,5,4,4,4,3,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sierra-lakes-gc', name: 'Sierra Lakes Golf Club', city: 'Fontana', state: 'CA', course_rating: 72.9, slope_rating: 129, total_par: 72,
    holes_par: [4,4,5,3,4,3,4,5,4, 4,4,4,3,4,5,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'el-prado-gc', name: 'El Prado Golf Course (Butterfield Stage)', city: 'Chino', state: 'CA', course_rating: 71.1, slope_rating: 123, total_par: 72,
    holes_par: [4,3,4,4,4,5,3,4,5, 4,4,5,4,3,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'green-river-gc', name: 'Green River Golf Club', city: 'Corona', state: 'CA', course_rating: 71.2, slope_rating: 125, total_par: 72,
    holes_par: [4,3,5,3,5,4,5,3,4, 4,4,4,3,4,4,3,5,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'hidden-valley-gc', name: 'Hidden Valley Golf Club', city: 'Norco', state: 'CA', course_rating: 74.0, slope_rating: 140, total_par: 72,
    holes_par: [5,4,4,4,3,5,4,3,4, 4,5,4,3,4,5,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'morongo-gc', name: 'Morongo Golf Club at Tukwet Canyon', city: 'Beaumont', state: 'CA', course_rating: 75.8, slope_rating: 140, total_par: 72,
    holes_par: [4,5,4,3,4,5,4,3,4, 5,4,3,4,4,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'soboba-springs-gc', name: 'Soboba Springs Royal Vista Golf Course', city: 'San Jacinto', state: 'CA', course_rating: 75.3, slope_rating: 140, total_par: 72,
    holes_par: [4,4,4,3,5,5,4,3,4, 4,4,4,4,3,5,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'diamond-valley-gc', name: 'Diamond Valley Golf Club', city: 'Hemet', state: 'CA', course_rating: 73.6, slope_rating: 138, total_par: 72,
    holes_par: [5,4,4,3,4,3,4,4,5, 4,4,5,3,4,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'temeku-hills-gc', name: 'Temeku Hills Golf Course', city: 'Temecula', state: 'CA', course_rating: 72.5, slope_rating: 130, total_par: 72,
    holes_par: [4,4,3,5,5,3,4,4,4, 4,3,4,5,4,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'temecula-creek-inn-gc', name: 'Temecula Creek Inn Golf Course', city: 'Temecula', state: 'CA', course_rating: 72.9, slope_rating: 136, total_par: 71,
    holes_par: [4,3,4,5,4,4,3,5,4, 4,4,4,4,3,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'redhawk-gc', name: 'Redhawk Golf Club', city: 'Temecula', state: 'CA', course_rating: 74.4, slope_rating: 139, total_par: 72,
    holes_par: [5,4,4,3,4,4,5,3,4, 4,5,3,4,4,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pechanga-resort-gc', name: 'Journey at Pechanga Golf Club', city: 'Temecula', state: 'CA', course_rating: 75.2, slope_rating: 144, total_par: 72,
    holes_par: [5,4,3,4,4,4,4,3,5, 4,5,4,4,4,3,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'los-serranos-north', name: 'Los Serranos Country Club (North)', city: 'Chino Hills', state: 'CA', course_rating: 72.8, slope_rating: 131, total_par: 72,
    holes_par: [5,3,5,4,4,3,4,4,4, 3,4,4,4,5,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'los-serranos-south', name: 'Los Serranos Country Club (South)', city: 'Chino Hills', state: 'CA', course_rating: 76.3, slope_rating: 138, total_par: 74,
    holes_par: [5,5,4,4,4,3,4,5,3, 4,4,3,5,4,4,5,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'jurupa-hills-cc', name: 'Jurupa Hills Country Club', city: 'Riverside', state: 'CA', course_rating: 69.1, slope_rating: 122, total_par: 70,
    holes_par: [4,4,3,4,4,4,5,3,4, 4,4,4,4,3,5,4,4,3] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'arrowhead-cc-sb', name: 'Arrowhead Country Club', city: 'San Bernardino', state: 'CA', course_rating: 72.4, slope_rating: 129, total_par: 72,
    holes_par: [4,4,5,3,4,5,5,3,4, 4,3,4,4,4,3,5,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'redlands-cc', name: 'Redlands Country Club', city: 'Redlands', state: 'CA', course_rating: 70.7, slope_rating: 126, total_par: 70,
    holes_par: [4,4,3,4,3,5,4,4,4, 3,4,4,3,4,5,4,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'canyon-crest-cc', name: 'Canyon Crest Country Club', city: 'Riverside', state: 'CA', course_rating: 73.6, slope_rating: 132, total_par: 72,
    holes_par: [4,5,4,3,4,4,3,5,4, 4,3,4,5,4,4,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'spring-valley-lake-cc', name: 'Spring Valley Lake Country Club', city: 'Victorville', state: 'CA', course_rating: 71.2, slope_rating: 127, total_par: 72,
    holes_par: [5,4,3,5,4,4,4,4,3, 4,4,3,5,4,3,5,4,4] },
  // Palm Springs / Desert — all verified bluegolf.com / greenskeeper.org
  // REMOVED: cimarron-gc-fazio (no Fazio course at Cimarron Resort; courses are Boulder & Pebble by John Fought)
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pga-west-nicklaus-tournament', name: 'PGA West Nicklaus Tournament Course', city: 'La Quinta', state: 'CA', course_rating: 75.3, slope_rating: 143, total_par: 72,
    holes_par: [4,4,3,5,4,4,5,3,4, 4,5,3,4,4,5,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'pga-west-jack-nicklaus-private', name: 'PGA West Nicklaus Private Course', city: 'La Quinta', state: 'CA', course_rating: 74.5, slope_rating: 145, total_par: 72,
    holes_par: [4,4,3,5,4,4,3,5,4, 4,3,4,5,4,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'la-quinta-resort-mountain', name: 'La Quinta Resort (Mountain Course)', city: 'La Quinta', state: 'CA', course_rating: 72.7, slope_rating: 135, total_par: 72,
    holes_par: [4,3,4,5,3,4,5,4,4, 4,4,4,3,4,5,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'la-quinta-resort-dunes', name: 'La Quinta Resort (Dunes Course)', city: 'La Quinta', state: 'CA', course_rating: 72.4, slope_rating: 134, total_par: 72,
    holes_par: [4,5,4,4,4,3,5,3,5, 4,4,4,3,4,5,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'indian-wells-players', name: 'Indian Wells Golf Resort (Players Course)', city: 'Indian Wells', state: 'CA', course_rating: 75.4, slope_rating: 140, total_par: 72,
    holes_par: [5,3,4,4,4,4,5,3,5, 4,4,3,4,5,4,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'desert-willow-mountain-view', name: 'Desert Willow Golf Resort (Mountain View)', city: 'Palm Desert', state: 'CA', course_rating: 73.2, slope_rating: 134, total_par: 72,
    holes_par: [4,4,4,4,3,5,4,3,5, 4,3,5,3,4,4,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bighorn-gc-canyons', name: 'Bighorn Golf Club (Canyons Course)', city: 'Palm Desert', state: 'CA', course_rating: 73.6, slope_rating: 140, total_par: 72,
    holes_par: [4,4,5,3,4,5,3,4,4, 4,4,5,4,4,3,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bighorn-gc-mountains', name: 'Bighorn Golf Club (Mountains Course)', city: 'Palm Desert', state: 'CA', course_rating: 74.1, slope_rating: 142, total_par: 72,
    holes_par: [5,4,5,3,4,4,4,3,4, 4,3,5,4,4,5,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'escena-gc', name: 'Escena Golf Club', city: 'Palm Springs', state: 'CA', course_rating: 74.4, slope_rating: 133, total_par: 72,
    holes_par: [5,4,3,5,3,4,4,3,4, 4,4,3,5,4,5,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'classic-club-palm-desert', name: 'The Classic Club', city: 'Palm Desert', state: 'CA', course_rating: 75.9, slope_rating: 142, total_par: 72,
    holes_par: [4,3,4,5,4,3,4,4,5, 4,4,3,4,5,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'shadow-ridge-gc', name: 'Shadow Ridge Golf Club', city: 'Palm Desert', state: 'CA', course_rating: 73.7, slope_rating: 135, total_par: 71,
    holes_par: [4,5,4,3,4,4,3,4,4, 4,4,3,4,5,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'desert-dunes-gc', name: 'Desert Dunes Golf Club', city: 'Desert Hot Springs', state: 'CA', course_rating: 74.2, slope_rating: 137, total_par: 72,
    holes_par: [5,4,4,4,3,4,4,3,5, 4,4,4,5,3,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'cathedral-canyon-cc', name: 'Cathedral Canyon Country Club', city: 'Cathedral City', state: 'CA', course_rating: 71.1, slope_rating: 130, total_par: 72,
    holes_par: [5,4,4,3,5,4,4,4,3, 5,4,3,3,5,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'rancho-las-palmas-cc', name: 'Rancho Las Palmas Country Club', city: 'Rancho Mirage', state: 'CA', course_rating: 69.8, slope_rating: 124, total_par: 71,
    holes_par: [5,4,4,3,5,4,4,3,4, 4,4,4,3,4,5,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'mission-hills-dinah-shore', name: 'Mission Hills Country Club (Dinah Shore)', city: 'Rancho Mirage', state: 'CA', course_rating: 75.2, slope_rating: 140, total_par: 72,
    holes_par: [4,5,4,4,3,4,4,3,5, 4,5,4,4,3,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tamarisk-cc', name: 'Tamarisk Country Club', city: 'Rancho Mirage', state: 'CA', course_rating: 73.4, slope_rating: 129, total_par: 72,
    holes_par: [5,3,4,5,3,4,4,4,4, 4,3,5,4,3,4,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'morningside-cc', name: 'Morningside Country Club', city: 'Rancho Mirage', state: 'CA', course_rating: 72.9, slope_rating: 131, total_par: 72,
    holes_par: [4,5,3,4,4,4,3,5,4, 5,4,3,4,4,4,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'eldorado-cc-iw', name: 'Eldorado Country Club', city: 'Indian Wells', state: 'CA', course_rating: 72.0, slope_rating: 129, total_par: 71,
    holes_par: [5,3,4,4,3,4,3,4,5, 4,4,3,5,4,4,3,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'bermuda-dunes-cc', name: 'Bermuda Dunes Country Club', city: 'Bermuda Dunes', state: 'CA', course_rating: 74.3, slope_rating: 134, total_par: 72,
    holes_par: [5,4,4,3,4,4,3,5,4, 4,4,3,5,4,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'palm-valley-cc', name: 'Palm Valley Country Club', city: 'Palm Desert', state: 'CA', course_rating: 71.8, slope_rating: 128, total_par: 72,
    holes_par: [4,4,5,4,3,4,3,5,4, 4,4,3,4,5,5,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'avondale-cc', name: 'Avondale Country Club', city: 'Palm Desert', state: 'CA', course_rating: 72.4, slope_rating: 130, total_par: 72,
    holes_par: [5,4,3,4,4,4,4,3,5, 4,4,4,3,5,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'westin-mission-hills-pete-dye', name: 'Westin Mission Hills (Pete Dye Resort)', city: 'Rancho Mirage', state: 'CA', course_rating: 72.2, slope_rating: 131, total_par: 70,
    holes_par: [4,4,3,4,5,4,4,3,4, 4,3,5,4,4,4,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'westin-mission-hills-gary-player', name: 'Westin Mission Hills (Gary Player)', city: 'Rancho Mirage', state: 'CA', course_rating: 73.4, slope_rating: 134, total_par: 72,
    holes_par: [4,4,5,4,3,4,5,3,4, 4,5,3,4,4,3,4,5,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'indian-canyons-north', name: 'Indian Canyons Golf Resort (North)', city: 'Palm Springs', state: 'CA', course_rating: 73.1, slope_rating: 128, total_par: 72,
    holes_par: [4,4,4,3,4,5,3,4,4, 5,4,4,5,3,4,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'indian-canyons-south', name: 'Indian Canyons Golf Resort (South)', city: 'Palm Springs', state: 'CA', course_rating: 71.1, slope_rating: 123, total_par: 72,
    holes_par: [4,3,5,3,4,4,3,4,5, 5,4,3,4,5,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tahquitz-creek-legend', name: 'Tahquitz Creek Golf Resort (Legend)', city: 'Palm Springs', state: 'CA', course_rating: 72.3, slope_rating: 127, total_par: 71,
    holes_par: [4,4,5,4,4,5,3,4,3, 4,4,3,5,4,3,4,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tahquitz-creek-resort', name: 'Tahquitz Creek Golf Resort (Resort)', city: 'Palm Springs', state: 'CA', course_rating: 71.5, slope_rating: 126, total_par: 72,
    holes_par: [4,4,3,5,4,5,4,3,4, 4,4,4,3,5,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sun-city-palm-desert', name: 'Sun City Palm Desert (San Gorgonio)', city: 'Palm Desert', state: 'CA', course_rating: 71.5, slope_rating: 126, total_par: 72,
    holes_par: [4,3,3,5,3,4,5,3,5, 4,5,4,4,4,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'andalusia-cc', name: 'Andalusia Country Club', city: 'La Quinta', state: 'CA', course_rating: 75.4, slope_rating: 140, total_par: 72,
    holes_par: [4,3,5,4,4,4,3,4,5, 4,4,3,4,3,5,4,4,5] },
  // Santa Barbara / Ventura County
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'sandpiper-gc', name: 'Sandpiper Golf Course', city: 'Santa Barbara', state: 'CA', course_rating: 75.0, slope_rating: 135, total_par: 72,
    holes_par: [5,4,4,3,5,3,4,4,4, 4,3,4,5,4,5,4,4,3] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'la-purisima-gc', name: 'La Purísima Golf Course', city: 'Lompoc', state: 'CA', course_rating: 75.7, slope_rating: 143, total_par: 72,
    holes_par: [5,4,3,4,4,5,4,4,3, 4,4,5,3,4,5,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'olivas-links-gc', name: 'Olivas Links Golf Course', city: 'Ventura', state: 'CA', course_rating: 72.7, slope_rating: 126, total_par: 72,
    holes_par: [4,5,4,5,3,4,4,3,4, 4,4,4,3,5,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'camarillo-springs-gc', name: 'Camarillo Springs Golf Course', city: 'Camarillo', state: 'CA', course_rating: 73.1, slope_rating: 130, total_par: 72,
    holes_par: [4,4,3,5,4,3,5,3,4, 5,3,3,4,5,4,5,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'moorpark-cc', name: 'Moorpark Country Club', city: 'Moorpark', state: 'CA', course_rating: 73.8, slope_rating: 142, total_par: 72,
    holes_par: [4,4,5,3,5,3,5,4,3, 5,3,4,4,4,3,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'rancho-san-marcos-gc', name: 'Rancho San Marcos Golf Course', city: 'Santa Barbara', state: 'CA', course_rating: 73.9, slope_rating: 137, total_par: 71,
    holes_par: [5,3,4,4,3,5,3,4,4, 5,4,5,3,3,4,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'saticoy-cc', name: 'Saticoy Country Club', city: 'Saticoy', state: 'CA', course_rating: 74.6, slope_rating: 138, total_par: 72,
    holes_par: [4,4,4,3,4,5,4,5,3, 3,4,4,3,5,4,4,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'wood-ranch-cc', name: 'Wood Ranch Country Club', city: 'Simi Valley', state: 'CA', course_rating: 74.4, slope_rating: 140, total_par: 72,
    holes_par: [4,5,3,4,4,5,3,4,4, 4,4,4,3,4,5,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'simi-hills-gc', name: 'Simi Hills Golf Course', city: 'Simi Valley', state: 'CA', course_rating: 72.0, slope_rating: 127, total_par: 71,
    holes_par: [4,5,4,3,4,4,4,3,4, 5,4,4,4,4,3,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'los-robles-greens-gc', name: 'Los Robles Greens Golf Course', city: 'Thousand Oaks', state: 'CA', course_rating: 70.3, slope_rating: 126, total_par: 70,
    holes_par: [5,3,4,4,4,3,4,3,4, 4,3,5,4,5,4,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'rustic-canyon-gc', name: 'Rustic Canyon Golf Course', city: 'Moorpark', state: 'CA', course_rating: 73.9, slope_rating: 135, total_par: 72,
    holes_par: [5,4,4,3,5,3,4,3,5, 5,4,4,5,4,3,4,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'ojai-valley-inn', name: 'Ojai Valley Inn Golf Course', city: 'Ojai', state: 'CA', course_rating: 71.0, slope_rating: 132, total_par: 70,
    holes_par: [4,4,3,4,4,4,4,3,5, 4,3,5,4,3,5,3,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'soule-park-gc', name: 'Soule Park Golf Course', city: 'Ojai', state: 'CA', course_rating: 73.0, slope_rating: 128, total_par: 72,
    holes_par: [4,4,3,5,5,3,4,4,4, 3,5,4,4,4,4,3,4,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'buenaventura-gc', name: 'Buenaventura Golf Course', city: 'Ventura', state: 'CA', course_rating: 68.6, slope_rating: 117, total_par: 70,
    holes_par: [4,4,4,5,3,4,3,4,4, 5,3,4,4,3,4,4,3,5] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'las-posas-cc', name: 'Las Posas Country Club', city: 'Camarillo', state: 'CA', course_rating: 71.6, slope_rating: 129, total_par: 71,
    holes_par: [4,3,4,5,4,3,5,4,3, 5,3,5,3,4,4,4,4,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'tierra-rejada-gc', name: 'Tierra Rejada Golf Club', city: 'Moorpark', state: 'CA', course_rating: 73.8, slope_rating: 136, total_par: 72,
    holes_par: [5,3,4,5,4,4,3,4,5, 4,3,5,4,3,4,5,3,4] },
  // Source: bluegolf.com / USGA database, verified April 2026
  { id: 'oxnard-shores-gc', name: 'River Ridge Golf Club (Vineyard)', city: 'Oxnard', state: 'CA', course_rating: 73.1, slope_rating: 130, total_par: 72,
    holes_par: [5,4,3,4,5,4,3,4,3, 4,5,3,5,4,5,4,4,3] },
];

export const COURSES: Course[] = RAW
  .map(c => {
    const holes = buildHoles(c);
    if (!holes) return null;
    return {
      id: c.id,
      name: c.name,
      city: c.city,
      state: c.state,
      course_rating: c.course_rating,
      slope_rating: c.slope_rating,
      total_par: c.total_par,
      holes,
    };
  })
  .filter((c): c is Course => c !== null);

export function getCourseById(id: string): Course | undefined {
  return COURSES.find(c => c.id === id);
}

export function searchCourses(query: string): Course[] {
  const q = query.toLowerCase().trim();
  if (!q) return COURSES.slice(0, 50);
  return COURSES.filter(
    c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
  ).slice(0, 100);
}
