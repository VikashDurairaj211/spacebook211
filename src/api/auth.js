import client from "./client";

export async function login(email, password) {
  const { data } = await client.post("/Auth/login", {
    email,
    password,
  });

  return {
    token: data.token,
    user: {
      id: data.employeeId,
      employeeId: data.employeeId,
      name: data.name,
      email: data.email,
      role: data.role,
    },
  };
}

export async function logout() {
  localStorage.removeItem("spacebook_token");
  localStorage.removeItem("spacebook_user");
}