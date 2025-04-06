"use client";

import useUserStore from "@/stores/useUserStoree";

export default function TestUserStore() {
  const user = useUserStore((state) => state.user);
  const accessToken = useUserStore((state) => state.accessToken);

  return (
    <div>
      <pre>
        {JSON.stringify({ user, accessToken }, null, 2)}
      </pre>
    </div>
  );
}