import axios from "./axios";

export const searchRooms = async (data) => {
  const response = await axios.post("/employee/searchrooms", data);
  return response.data;
};