# Componente: DomainArchitecture (Camada 2)

Segunda camada de scroll — **arquitetura / domínio único**. Três pilares do método de trabalho do
laboratório cujos **conectores se traçam** convergindo num único **card de domínio** ao revelar: a imagem
literal de *"soluções plugadas em um único domínio"*
([ADR-0010](../../adr/0010-independencia-entre-apps.md), CONTEXT.md).

## Código

- [`apps/web/src/components/DomainArchitecture/DomainArchitecture.tsx`](../../../apps/web/src/components/DomainArchitecture/DomainArchitecture.tsx)
- [`apps/web/src/components/DomainArchitecture/DomainArchitecture.module.css`](../../../apps/web/src/components/DomainArchitecture/DomainArchitecture.module.css)

## Estrutura

```
<section.section>                      ← bg-root, border-top hairline
  <div.inner>                          ← container 1080px, padding 96/40
    <Reveal.eyebrowRow>  <p.eyebrow> // arquitetura
    <Reveal.headingRow>  <h2.heading> domínio único
    <Reveal.ledeRow>     <p.lede> Soluções plugadas …
    <Reveal.diagram (flex, 920×340)>
      <div.pillars (340)>  <div.pillar> dot · nome · detalhe </div> × 3
      <svg.connectors (200×340)>  3× <path.connector> + <circle.node>
      <div.domain (flex:1)>
        <span.domainLabel> = um domínio
        <div.domainCard>               ← border violeta, --shadow-domain-card
          <div.domainCardHead> <Logo 30 alt=""/> panlabs.tech   ← brand wash
          <div.domainCardBody> // soluções plugadas no domínio + 2 chips
```

## Diagrama

- **Pilares** (`.pillar`): `--bg-surface`, `--border-default`, `border-radius: 12px`, `min-height: 96px`.
  Cabeça = `.dot` (8px, cor de marca + `box-shadow` glow da mesma cor) + nome (mono 13px, semibold). Detalhe
  mono 11px, `--text-muted`. Os três pilares: **desenvolvimento padronizado** (magenta), **soluções
  agênticas** (violet), **harness garantido** (blue).
- **Conectores** (`.connector`): três `<path>` (bézier/reta) com `stroke` de marca, `opacity: .75`, que se
  traçam (`--len: 340`, `--duration-draw`) quando o `.diagram` revela (`[data-shown="true"]`), convergindo
  no `.node` (`--color-brand-violet-light`). SVG **`aria-hidden`** (decorativo).
- **Card de domínio** (`.domainCard`): `--bg-surface`, borda `--color-hover-border` (violeta .4),
  `--shadow-domain-card`. Cabeçalho com **brand wash** (literal consciente — ver
  [design-spec](../design-spec.md#literais-conscientes)) + `<Logo>` 30px (`alt=""`, decorativo — a marca já
  é nomeada) + `panlabs.tech` (mono 16px, bold, `--text-max`). Corpo: nota `// soluções plugadas no
  domínio` + dois chips (`soluções no ar` ponto verde glow · `preview ao vivo` ponto violeta).

## Movimento & a11y

- Reveal por bloco; conectores desenham via `[data-shown]` — ver [reveal.md](reveal.md).
- **Reduced-motion:** conectores já desenhados (`dashoffset: 0`, sem transição).
- `<h2> domínio único` é o título da seção; o `<svg>` e os pontos são `aria-hidden`.

## Responsivo

- `≤ 880px`: o diagrama **empilha** (`flex-direction: column`, `height: auto`), os **conectores somem**
  (`display: none`) e pilares/card vão a 100% — antes que a linha fixa (340 + 200 + card) transborde.
- `≤ 639px`: `.inner` padding `60/20`; heading `26px`.
