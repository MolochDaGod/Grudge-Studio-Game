import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

import type { Character, LeaderboardEntry, SubmitScoreBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType } from "../custom-fetch";

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

export const getCharactersUrl = () => "/api/game/characters";

export const getCharacters = async (
  options?: RequestInit,
): Promise<Character[]> => {
  return customFetch<Character[]>(getCharactersUrl(), {
    ...options,
    method: "GET",
  });
};

export const getCharactersQueryKey = () => ["/api/game/characters"] as const;

export const getCharactersQueryOptions = <
  TData = Awaited<ReturnType<typeof getCharacters>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof getCharacters>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getCharactersQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getCharacters>>> = ({
    signal,
  }) => getCharacters({ signal, ...requestOptions });

  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getCharacters>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export function useGetCharacters<
  TData = Awaited<ReturnType<typeof getCharacters>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof getCharacters>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getCharactersQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };
  return { ...query, queryKey: queryOptions.queryKey };
}

export const getLeaderboardUrl = () => "/api/game/leaderboard";

export const getLeaderboard = async (
  options?: RequestInit,
): Promise<LeaderboardEntry[]> => {
  return customFetch<LeaderboardEntry[]>(getLeaderboardUrl(), {
    ...options,
    method: "GET",
  });
};

export const getLeaderboardQueryKey = () => ["/api/game/leaderboard"] as const;

export const getLeaderboardQueryOptions = <
  TData = Awaited<ReturnType<typeof getLeaderboard>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof getLeaderboard>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getLeaderboardQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getLeaderboard>>> = ({
    signal,
  }) => getLeaderboard({ signal, ...requestOptions });

  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getLeaderboard>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export function useGetLeaderboard<
  TData = Awaited<ReturnType<typeof getLeaderboard>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof getLeaderboard>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getLeaderboardQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };
  return { ...query, queryKey: queryOptions.queryKey };
}

export const getSubmitScoreUrl = () => "/api/game/scores";

export const submitScore = async (
  submitScoreBody: SubmitScoreBody,
  options?: RequestInit,
): Promise<LeaderboardEntry> => {
  return customFetch<LeaderboardEntry>(getSubmitScoreUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(submitScoreBody),
  });
};

export const getSubmitScoreMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof submitScore>>,
    TError,
    { data: SubmitScoreBody },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const mutationKey = ["/api/game/scores"];
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof submitScore>>,
    { data: SubmitScoreBody }
  > = (props) => submitScore(props.data, requestOptions);

  return { mutationKey, mutationFn, ...mutationOptions };
};

export function useSubmitScore<
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof submitScore>>,
    TError,
    { data: SubmitScoreBody },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof submitScore>>,
  TError,
  { data: SubmitScoreBody },
  TContext
> {
  const mutationOptions = getSubmitScoreMutationOptions(options);
  return useMutation(mutationOptions);
}