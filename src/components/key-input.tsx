import { fetchAppVersions, fetchWordApps } from "@/actions/actions";
import { useLocal } from "@/hooks/useLocal";
import { AppWithVersions } from "@/types/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { Input } from "./ui/input";

interface KeyInputProps {
  updateApiKey: (newApiKey: string) => void;
  updateApps: (newApps: AppWithVersions[]) => void;
  apps: AppWithVersions[];
  setIsFetching: (isFetching: boolean) => void;
}

export function KeyInput({
  updateApiKey,
  updateApps,
  apps,
  setIsFetching,
}: KeyInputProps) {
  const { apiKey } = useLocal();
  const [error, setError] = useState<string | null>(null);

  const formSchema = z.object({
    apiKey: z.string(),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  // set the default value once loaded from local storage
  useEffect(() => {
    form.reset({ apiKey });
  }, [apiKey, form]);

  const fetchApps = async (apiKey: string) => {
    setIsFetching(true);
    try {
      const fetchedApps = await fetchWordApps(apiKey);
      const appsWithVersions: AppWithVersions[] = [];

      for (const app of fetchedApps) {
        try {
          const versions = await fetchAppVersions(
            apiKey,
            app.orgSlug,
            app.appSlug,
          );

          const versionsSorted = versions.reverse();

          const versionWithRuns = versionsSorted.map((version) => {
            const existingVersion = apps
              .find((a) => a.appSlug === app.appSlug)
              ?.versions.find((v) => v.version === version.version);
            if (existingVersion) {
              return {
                ...version,
                runs: existingVersion.runs,
              };
            } else {
              return {
                ...version,
                runs: [],
              };
            }
          });

          appsWithVersions.push({
            ...app,
            versions: versionWithRuns,
            selectedVersion: versionsSorted[0]?.version || "",
          });
        } catch (versionError) {
          console.error(
            `Error fetching versions for ${app.appSlug}:`,
            versionError,
          );
        }
      }

      appsWithVersions.sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
      );

      updateApps(appsWithVersions);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setError(null);
    updateApiKey(data.apiKey);
    setIsFetching(true);
    try {
      await fetchApps(data.apiKey);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      setError(
        "Failed to fetch apps. Please check your API key and try again.",
      );
    }
  };

  // useEffect(() => {
  //   if (apiKey) {
  //     fetchApps(apiKey);
  //   }
  // }, [apiKey, fetchApps]);

  return (
    <Form {...form}>
      <form className="w-full" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex">
                  <Input
                    disabled={form.formState.isSubmitting}
                    placeholder="API Key"
                    className="flex-grow rounded-r-none"
                    {...field}
                  />
                  <Button
                    disabled={form.formState.isSubmitting}
                    type="submit"
                    size="icon"
                    className="rounded-l-none px-2"
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
              {error && <p className="text-destructive">{error}</p>}
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
