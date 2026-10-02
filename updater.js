import { updateParking } from "./script.js";
export function update(snapshot) {
  const data = snapshot.val();
  console.log("data");
  console.log(data);
  updateParking(data);
}
