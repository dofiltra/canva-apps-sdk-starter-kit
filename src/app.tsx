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
  Accordion,
  AccordionItem,
  Carousel,
  EmbedCard,
  TrashIcon,
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

type TDatafile = {
  [doprompt: string]: { index: number; base64: string[]; heading?: string };
};

const initialConfig: TextConfig = {
  color: "#8B3DFF",
  fontWeight: "normal",
  fontStyle: "normal",
  fontSize: 90,
};

export const App = () => {
  const addElement = useAddElement();
  const [tab, setTab] = useState<"settings" | "datafile" | "manual">(
    "datafile",
  );
  const [loading, setLoading] = useState(false);
  const [limitSlidesCount, setLimitSlidesCount] = useState(5);
  const [opacity, setOpacity] = useState<Map<"text" | "image", number>>(
    new Map([
      ["text", 0.1],
      ["image", 0.5],
    ]),
  );
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
  const [canvaData, setCanvaData] = useState<TDatafile>({});

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
    // TODO: use handleDatafileCreatePage
  }

  async function handleDatafileCreatePage() {
    setLoading(true);
    const { width = 1920, height = 1080 } = {
      ...(await getDefaultPageDimensions()),
    };

    const doprompts = Object.keys(canvaData)
      .sort((a, b) => (canvaData[a].index > canvaData[b].index ? 1 : -1))
      .slice(0, limitSlidesCount);

    for (const doprompt of doprompts) {
      const { base64 = [], heading } = canvaData[doprompt];
      const uniqList = [...new Set(base64).values()];
      let i = 0;

      for (const imageBase64 of uniqList) {
        const img = imageBase64
          ? await upload({
              type: "image",
              mimeType: "image/png",
              aiDisclosure: "none",
              url: imageBase64,
              thumbnailUrl: imageBase64,
            })
          : null;
        await img?.whenUploaded?.();
        await sleep(1e3);

        const elements: ElementAtPoint[] = [
          img?.ref && {
            type: "image",
            altText: { decorative: false, text: "pic" },
            height,
            width,
            left: 0,
            top: 0,
            ref: img.ref,
          },
        ].filter((x) => x) as ElementAtPoint[];

        await addPage({
          title: heading?.slice(0, 255),
          elements,
        });
        await sleep(1e3);

        if (heading?.trim?.() && i === 0) {
          addElement({
            type: "text",
            ...textConfig,
            fontSize: 90,
            fontRef: selectedFont?.ref,
            children: [splitTextEveryNWords({ text: heading, everyN: 3 })],
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
                element.transparency = opacity.get("text") || 0.1;
                element = {
                  ...element,
                  top: 0,
                  left: 0,
                  // width: 'auto',
                  height: height,
                };
              }

              if (element.type === "rect") {
                element.left = (width - element.width) / 2;
                element.transparency = opacity.get("image") || 0.5;
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
    setLoading(false);
  }

  return (
    <div className={styles.scrollContainer}>
      <Tabs>
        <TabList align="start">
          <Tab
            id="settings"
            active={tab === "settings"}
            onClick={() => setTab("settings")}
          >
            Settings
          </Tab>
          <Tab
            id="datafile"
            active={tab === "datafile"}
            onClick={() => setTab("datafile")}
          >
            Datafile
          </Tab>
          <Tab
            id="manual"
            active={tab === "manual"}
            onClick={() => setTab("manual")}
          >
            Manual
          </Tab>
        </TabList>
      </Tabs>

      <br />

      {tab === "settings" && (
        <>
          <Title>Settings</Title>
          <br />

          <Accordion>
            <AccordionItem title="Slides">
              <Text>Add slides count</Text>
              <NumberInput
                onChangeComplete={(val) => setLimitSlidesCount(val || 3)}
                defaultValue={limitSlidesCount}
              />
            </AccordionItem>

            <AccordionItem title="Slides">
              <Text>Opacity text</Text>
              <NumberInput
                onChangeComplete={(val) =>
                  setOpacity((old) => {
                    old.set("text", val || 0.1);
                    return old;
                  })
                }
                defaultValue={opacity.get("text")}
              />

              <Text>Opacity image</Text>
              <NumberInput
                onChangeComplete={(val) =>
                  setOpacity((old) => {
                    old.set("image", val || 0.5);
                    return old;
                  })
                }
                defaultValue={opacity.get("image")}
              />
            </AccordionItem>

            <AccordionItem title="Font">
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
            </AccordionItem>
          </Accordion>
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

              setLoading(true);
              const filetext = await file.text();
              try {
                let data = JSON.parse(filetext) as TDatafile;

                Object.keys(data).forEach((key) => {
                  data[key].base64 = [...new Set(data[key].base64)];
                });

                setCanvaData(data);
              } catch (e) {
                console.error(e);
              }
              setLoading(false);
            }}
          />

          <br />
          {!!Object.keys(canvaData).length && (
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
                      const { index, heading, base64 = [] } = canvaData[key];
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
                          <Text>
                            {index} {heading}
                          </Text>
                          <Carousel>
                            {base64.map((base64Item) => (
                              <>
                                <img
                                  src={base64Item}
                                  style={{ width: "100%", height: "128px" }}
                                />

                                <Button
                                  alignment="center"
                                  icon={() => <TrashIcon />}
                                  onClick={() => {
                                    console.log("x");

                                    setCanvaData((old) => {
                                      console.log(
                                        "i1",
                                        old[key].base64.some(
                                          (x) => x === base64Item,
                                        ),
                                      );
                                      old[key].base64 = old[key].base64.filter(
                                        (x) => x !== base64Item,
                                      );
                                      console.log("o", old[key].base64.length);
                                      return old;
                                    });
                                  }}
                                  variant="tertiary"
                                ></Button>
                              </>
                            ))}
                          </Carousel>

                          <br />
                        </>
                      );
                    })}
                  </Rows>
                </Scrollable>
              </Box>
            </Rows>
          )}
        </>
      )}

      {tab === "manual" && (
        <>
          <Title>Manual</Title>
          <br />

          <Accordion>
            <AccordionItem title="Images">
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

              <br />
              {!!images.length && (
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
              )}
            </AccordionItem>
            <AccordionItem title="Headings">
              <MultilineInput
                autoGrow
                onBlur={(e) =>
                  setHeadings(
                    e.currentTarget.value
                      .split("\n")
                      .filter((x) => x?.trim?.()),
                  )
                }
              />

              <br />
              {!!headings.length && (
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
              )}
            </AccordionItem>
          </Accordion>
        </>
      )}

      {((images.length || headings.length || Object.keys(canvaData).length) && (
        <>
          <hr />
          <br />
          <Button
            variant="primary"
            onClick={() => {
              if (Object.keys(canvaData).length) {
                return handleDatafileCreatePage();
              }
              handleManualCreatePage();
            }}
            stretch
            disabled={loading}
          >
            Create next pages
          </Button>
        </>
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

function splitTextEveryNWords({
  text,
  everyN = 3,
}: {
  text: string;
  everyN?: number;
}) {
  return text
    .split(" ")
    .reduce((acc, word, index) => {
      return acc + word + ((index + 1) % everyN === 0 ? "\n" : " ");
    }, "")
    .trim();
}
