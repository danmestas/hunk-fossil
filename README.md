# hunk-fossil

[Fossil](https://fossil-scm.org) and [zit](https://zeitforge.app/r/dmestas/zit)
backends for [hunk](https://github.com/modem-dev/hunk), the terminal diff
viewer. Hunk ships with Git, Jujutsu and Sapling support; this extension adds
the same `hunk diff` and `hunk show` inside a fossil or zit checkout.

## Install

```sh
hunk extension install danmestas/hunk-fossil
```

Needs hunk 0.18 or later, and `fossil` or `zit` on your `PATH`.

## Use

Inside a checkout:

```sh
hunk diff               # the checkout's changes, plus untracked files
hunk diff VERSION       # VERSION against the checkout
hunk diff A..B          # check-in A against check-in B
hunk show [VERSION]     # what VERSION changed (default: the current check-in)
```

`VERSION` is any name the VCS accepts: a hash prefix, a tag, a branch, `trunk~5`.
Untracked files come from `fossil extras` or `zit extras`; `--exclude-untracked`
leaves them out.

A fossil checkout is recognized by `.fslckout` or `_FOSSIL_`, a zit checkout by
`.zit-checkout`, in the current directory or any parent.

## Without installing

Any fossil or zit diff can also be piped in:

```sh
fossil diff | hunk patch -
zit diff | hunk patch -
```

## Limits

- `--staged` is refused: neither fossil nor zit has a staging area.
- `hunk stash show` is not supported.

## License

BSD 2-Clause. See [LICENSE](LICENSE).
