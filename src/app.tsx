import {
  Box,
  Button,
  ChevronDownIcon,
  Rows,
  ImageCard,
  FileInput,
  MultilineInput,
  FileInputItem,
  Text,
  Scrollable,
  Title,
  Tab,
  TabList,
  Tabs,
  NumberInput,
} from "@canva/app-ui-kit";
import type { Font, FontStyle, FontWeightName } from "@canva/asset";
import { findFonts, requestFontSelection, upload } from "@canva/asset";
import {
  FontRef,
  openDesign,
  addPage,
  readContent,
  getDefaultPageDimensions,
  getDesignToken,
  selection,
  getCurrentPageContext,
  overlay,
  ElementAtPoint,
} from "@canva/design";
import { sleep } from "@dofiltra/helpers";
import { useState, useEffect, useCallback } from "react";
import * as styles from "styles/components.css";
import { useAddElement } from "utils/use_add_element";

type TextConfig = {
  color: string;
  fontSize: number;
  fontWeight: FontWeightName;
  fontStyle: FontStyle;
};

const initialConfig: TextConfig = {
  color: "#8B3DFF",
  fontWeight: "normal",
  fontStyle: "normal",
  fontSize: 90,
};

export const App = () => {
  const addElement = useAddElement();
  const [tab, setTab] = useState<
    "images" | "headings" | "settings" | "datafile"
  >("settings");
  const [limitSlidesCount, setLimitSlidesCount] = useState(5);
  const [textConfig, setTextConfig] = useState<TextConfig>(initialConfig);
  const [selectedFont, setSelectedFont] = useState<Font | undefined>({
    ref: "YAEzvsyzAMI:0" as FontRef,
    name: "Funtastic",
    weights: [
      {
        weight: "normal",
        styles: ["normal"],
      },
    ],
    previewUrl:
      "https://media.canva.com/1/font-render/2/RnVudGFzdGlj_64_896_96_C_B_A_1.4_00000000_0e1318ff_A/aWZzOi8vLzE2Zjc5MTI4LTEwNDgtNGZjNy1hYTUyLTNhMTJiYzdlODk0YQ?osig=AAAAAAAAAAAAAAAAAAAAAHR1vtdd_Ff-CEHDuNM6jRtu-iK8RRNLfKwf-KVDcRQN&exp=1733412013&csig=AAAAAAAAAAAAAAAAAAAAAIs6Lldh-2lhMmyZ6XoSCTbjMDW79E430p1qIVMzcjAG",
  } as Font);
  const [images, setImages] = useState([] as string[]);
  const [headings, setHeadings] = useState([] as string[]);

  const [canvaData, setCanvaData] = useState<{
    [doprompt: string]: { base64: string[]; heading?: string };
  }>({});

  const { fontWeight, fontStyle } = textConfig;

  const resetSelectedFontStyleAndWeight = (selectedFont?: Font) => {
    setTextConfig((prevState) => {
      return {
        ...prevState,
        fontStyle:
          getFontStyles(fontWeight, selectedFont)[0]?.value || "normal",
        fontWeight: getFontWeights(selectedFont)[0]?.value || "normal",
      };
    });
  };

  async function handleManualCreatePage() {
    const { width = 1920, height = 1080 } = {
      ...(await getDefaultPageDimensions()),
    };

    const nextPages = new Array(limitSlidesCount).fill(true).map((_, i) => ({
      imageBase64: images[i],
      heading: headings[i],
    }));

    for (const { heading, imageBase64 } of nextPages) {
      if (!heading && !imageBase64) {
        continue;
      }

      const img = imageBase64
        ? await upload({
            type: "image",
            mimeType: "image/png",
            aiDisclosure: "none",
            url: imageBase64,
            thumbnailUrl: imageBase64,
          })
        : null;

      await sleep(5e3);

      const elements: ElementAtPoint[] = [
        img?.ref && {
          type: "image",
          altText: { decorative: false, text: "pic" },
          height,
          width: "auto",
          left: 50,
          top: 0,
          ref: img.ref,
        },
      ].filter((x) => x) as ElementAtPoint[];

      await addPage({
        title: heading?.split(" ").slice(0, 2).join(" "),
        elements,
      });

      if (heading?.trim?.()) {
        addElement({
          type: "text",
          ...textConfig,
          fontRef: selectedFont?.ref,
          children: [heading],
        });
      }

      await new Promise((resolve) => {
        openDesign({ type: "current_page" }, async (draft) => {
          if (draft.page.type !== "fixed") {
            return resolve(false);
          }

          draft.page.elements.forEach(async (element, index) => {
            console.log(
              `#${index + 1}: Type=${element.type}, Position=(${element.left}, ${element.top})`,
              element,
            );
            element.transparency = 0.25;

            if (element.type === "text") {
              element = {
                ...element,
                top: 50,
                left: 100,
                width: width / 3,
              };
            }

            if (element.type === "rect") {
              element.transparency = 0.3;
            }
          });

          return resolve(await draft.save());
        });
      });

      if (heading) {
        setHeadings((old) => old.filter((o) => o !== heading));
      }
      if (imageBase64) {
        setImages((old) => old.filter((o) => o !== imageBase64));
      }
    }
  }

  async function handleDatafileCreatePage() {
    const { width = 1920, height = 1080 } = {
      ...(await getDefaultPageDimensions()),
    };

    const doprompts = Object.keys(canvaData).slice(0, limitSlidesCount);

    for (const doprompt of doprompts) {
      const { base64 = [], heading } = canvaData[doprompt];
      let i = 0;

      for (const imageBase64 of [...new Set(base64).values()]) {
        const img = imageBase64
          ? await upload({
              type: "image",
              mimeType: "image/png",
              aiDisclosure: "none",
              url: imageBase64,
              thumbnailUrl: imageBase64,
            })
          : null;
        await sleep(5e3);

        const elements: ElementAtPoint[] = [
          img?.ref && {
            type: "image",
            altText: { decorative: false, text: "pic" },
            height,
            width: "auto",
            left: 50,
            top: 0,
            ref: img.ref,
          },
        ].filter((x) => x) as ElementAtPoint[];

        await addPage({
          title: heading?.split(" ").slice(0, 2).join(" "),
          elements,
        });
        await sleep(3e3);

        if (heading?.trim?.() && i === 0) {
          addElement({
            type: "text",
            ...textConfig,
            fontSize: 90,
            fontRef: selectedFont?.ref,
            children: [
              heading
                .split(" ")
                .map((w, i) => w + (i % 3 !== 0 ? "\n" : " "))
                .join(""),
            ],
          });
        }

        await new Promise((resolve) => {
          openDesign({ type: "current_page" }, async (draft) => {
            if (draft.page.type !== "fixed") {
              return resolve(false);
            }

            draft.page.elements.forEach(async (element, index) => {
              console.log(
                `#${index + 1}: Type=${element.type}, Position=(${element.left}, ${element.top})`,
                element,
              );

              if (element.type === "text") {
                element.transparency = 0.25;
                element = {
                  ...element,
                  top: 50,
                  left: 100,
                  width: width,
                  height: 90,
                };
              }

              if (element.type === "rect") {
                element.transparency = 0.3;
              }
            });

            return resolve(await draft.save());
          });
        });
        i++;
      }

      setCanvaData((old) => {
        delete old[doprompt];
        return old;
      });
    }
  }

  return (
    <div className={styles.scrollContainer}>
      <Tabs>
        <TabList align="start">
          <Tab id="settings" onClick={() => setTab("settings")}>
            Settings
          </Tab>
          <Tab id="datafile" onClick={() => setTab("datafile")}>
            Datafile
          </Tab>
          <Tab id="images" onClick={() => setTab("images")}>
            Images
          </Tab>
          <Tab id="headings" onClick={() => setTab("headings")}>
            Headings
          </Tab>
        </TabList>
      </Tabs>

      <br />

      {tab === "settings" && (
        <>
          <Title>Settings</Title>
          <hr />
          <br />

          <Text>Add slides count</Text>
          <NumberInput
            onChangeComplete={(val) => setLimitSlidesCount(val || 3)}
            defaultValue={limitSlidesCount}
          />
          <hr />

          <Text>Font</Text>
          <Rows spacing="2u">
            <Button
              variant="secondary"
              icon={ChevronDownIcon}
              iconPosition="end"
              alignment="start"
              stretch={true}
              onClick={async () => {
                const response = await requestFontSelection({
                  selectedFontRef: selectedFont?.ref,
                });
                console.log(`requestFontSelection`, response);
                if (response.type === "completed") {
                  setSelectedFont(response.font);
                  resetSelectedFontStyleAndWeight(response.font);
                }
              }}
            >
              {selectedFont?.name || "Select a font"}
            </Button>
            {selectedFont?.previewUrl && (
              <Box background="neutralLow" padding="2u" width="full">
                <Rows spacing="0" align="center">
                  <Box>
                    <ImageCard
                      thumbnailUrl={selectedFont.previewUrl}
                      alt={selectedFont.name}
                    />
                  </Box>
                </Rows>
              </Box>
            )}
          </Rows>
        </>
      )}

      {tab === "datafile" && (
        <>
          <Title>Datafiles</Title>
          <hr />
          <br />
          <FileInput
            accept={[".json", ".txt"]}
            multiple={false}
            stretchButton
            onDropAcceptedFiles={async (files) => {
              const file = files?.[0];
              if (!file) {
                return;
              }

              const filetext = await file.text();
              try {
                setCanvaData(JSON.parse(filetext));
              } catch (e) {
                console.error(e);
              }
            }}
          />

          <hr />
          <Rows key={`canvaData`} spacing="1u">
            <Box
              border="standard"
              padding="1u"
              className={""}
              // background={background}
            >
              <Scrollable
              // indicator={{
              //   background,
              // }}
              >
                <Rows spacing="1u">
                  {Object.keys(canvaData).map((key, i) => {
                    return (
                      <>
                        <FileInputItem
                          key={`canvaData_${i}`}
                          label={key}
                          onDeleteClick={() =>
                            setCanvaData((old) => {
                              delete old[key];
                              return old;
                            })
                          }
                        />
                      </>
                    );
                  })}
                </Rows>
              </Scrollable>
            </Box>
          </Rows>
        </>
      )}

      {tab === "images" && (
        <>
          <Title>Images</Title>
          <hr />
          <br />
          <Rows spacing="2u">
            <FileInput
              accept={["image/png"]}
              multiple={true}
              stretchButton
              onDropAcceptedFiles={async (files) => {
                setImages(
                  await Promise.all(
                    files.map(async (minifiedFile) => {
                      const base64File = await toBase64(minifiedFile);
                      return base64File;
                    }),
                  ),
                );
              }}
            />
          </Rows>

          <hr />
          <Rows key={`images`} spacing="1u">
            <Box
              border="standard"
              padding="1u"
              className={""}
              // background={background}
            >
              <Scrollable
              // indicator={{
              //   background,
              // }}
              >
                <Rows spacing="1u">
                  {images.map((x, i) => {
                    return (
                      <>
                        <FileInputItem
                          key={`image_file_${i}`}
                          label={`${images.length - i}`}
                          onDeleteClick={() =>
                            setImages((old) => old.filter((o) => o !== x))
                          }
                        />
                      </>
                    );
                  })}
                </Rows>
              </Scrollable>
            </Box>
          </Rows>
        </>
      )}

      {tab === "headings" && (
        <>
          <Title>Headings</Title>
          <hr />
          <br />

          <MultilineInput
            autoGrow
            onBlur={(e) =>
              setHeadings(
                e.currentTarget.value.split("\n").filter((x) => x?.trim?.()),
              )
            }
          />

          <hr />
          <Rows key={`headings`} spacing="1u">
            <Box
              border="standard"
              padding="1u"
              className={""}
              // background={background}
            >
              <Scrollable
              // indicator={{
              //   background,
              // }}
              >
                <Rows spacing="1u">
                  {headings.map((x, i) => {
                    return (
                      <>
                        <FileInputItem
                          key={`heading_${i}`}
                          label={`${i + 1}`}
                          onDeleteClick={() =>
                            setImages((old) => old.filter((o) => o !== x))
                          }
                        />
                      </>
                    );
                  })}
                </Rows>
              </Scrollable>
            </Box>
          </Rows>
        </>
      )}

      <hr />
      <br />
      {((images.length || headings.length || Object.keys(canvaData).length) && (
        <Button
          variant="primary"
          onClick={() => {
            if (Object.keys(canvaData).length) {
              return handleDatafileCreatePage();
            }
            handleManualCreatePage();
          }}
          stretch
        >
          Create next pages
        </Button>
      )) ||
        ""}
    </div>
  );
};

const getFontWeights = (
  font?: Font,
): {
  value: FontWeightName;
  label: FontWeightName;
}[] => {
  return font
    ? font.weights.map((w) => ({
        value: w.weight,
        label: w.weight,
      }))
    : [];
};

const getFontStyles = (
  fontWeight: FontWeightName,
  font?: Font,
): {
  value: FontStyle;
  label: FontStyle;
}[] => {
  return font
    ? (font.weights
        .find((w) => w.weight === fontWeight)
        ?.styles.map((s) => ({ value: s, label: s })) ?? [])
    : [];
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
