// https://softwaremill.com/implementing-advanced-type-level-arithmetic-in-typescript-part-1/

type ParseInt<T extends string> = T extends `${infer Digit extends number}` ? Digit : never

type ReverseString<S extends string> = S extends `${infer First}${infer Rest}` ? `${ReverseString<Rest>}${First}` : ''

type RemoveLeadingZeros<S extends string> = S extends '0' ? S : S extends `0{infer R}` ? RemoveLeadingZeros<R> : S

type PutSign<S extends string> = `-${S}`

type InternalMinusOne<S extends string> = S extends `${infer Digit extends number}${infer Rest}`
    ? Digit extends 0
        ? `9${InternalMinusOne<Rest>}`
        : `${[9, 0, 1, 2, 3, 4, 5, 6, 7, 8][Digit]}${Rest}`
    : never

type InternalPlusOne<S extends string> = S extends '9'
    ? '01'
    : S extends `${infer Digit extends number}${infer Rest}`
      ? Digit extends 9
          ? `0${InternalPlusOne<Rest>}`
          : `${[1, 2, 3, 4, 5, 6, 7, 8, 9][Digit]}${Rest}`
      : never

export type PlusOne<T extends number> = T extends -1
    ? 0
    : `${T}` extends `-${infer Abs}`
      ? ParseInt<PutSign<RemoveLeadingZeros<ReverseString<InternalMinusOne<ReverseString<Abs>>>>>>
      : ParseInt<RemoveLeadingZeros<ReverseString<InternalPlusOne<ReverseString<`${T}`>>>>>

export type PreviousNumbers<T extends number, Acc extends unknown[] = []> = T extends 0
    ? never // If T is 0, return never (no previous numbers)
    : Acc['length'] extends T
      ? Exclude<Acc[number], 0> // If the accumulated length matches T, return the accumulated numbers
      : PreviousNumbers<T, [...Acc, Acc['length'] | 1]> // Recursively accumulate numbers

// https://stackoverflow.com/a/58436959

type Join<K, P> = K extends string | number
    ? P extends string | number
        ? `${K}${'' extends P ? '' : '.'}${P}`
        : never
    : never

type Prev = [never, 0, 1, 2, 3, 4]

export type Paths<T, D = 5> = [D] extends [never]
    ? never
    : T extends object
      ? { [K in keyof T]-?: K extends string | number ? `${K}` | Join<K, Paths<T[K], Prev[D]>> : never }[keyof T]
      : ''

export type ValueOfPath<T, P extends string, D = 5> = [D] extends [never]
    ? never
    : P extends `${infer K}.${infer Rest}`
      ? K extends keyof T
          ? ValueOfPath<T[K], Rest, Prev[D]>
          : never
      : P extends keyof T
        ? T[P] extends infer U
            ? U | undefined
            : never
        : never
